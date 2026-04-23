import json
import math
import os

import sympy as sp
from dotenv import load_dotenv
from google import genai

load_dotenv()


PROMPT_RECOMENDACION = """
Eres un profesor de metodos numericos.
Debes recomendar UN solo metodo entre:
- biseccion
- regulafalsi
- newton
- secante
- punto_fijo

Responde SOLO JSON valido con esta forma:
{
  "metodo": "newton",
  "motivo": "explicacion breve en espanol",
  "advertencia": "detalle opcional breve",
  "parametros_sugeridos": {
    "a": 1.0,
    "b": 2.0,
    "x0": 1.5,
    "x1": 2.0
  }
}
""".strip()


def _obtener_cliente():
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)


def _extraer_texto_respuesta(respuesta):
    texto = (getattr(respuesta, "text", None) or "").strip()
    if texto:
        return texto
    for cand in getattr(respuesta, "candidates", []) or []:
        contenido = getattr(cand, "content", None)
        for parte in getattr(contenido, "parts", []) or []:
            parte_texto = (getattr(parte, "text", None) or "").strip()
            if parte_texto:
                return parte_texto
    return ""


def _motivo_local(expr, funcion: str):
    texto = funcion.lower()
    simbolos = expr.free_symbols
    x = sp.Symbol("x")

    if "sqrt" in texto or "log" in texto or "/" in texto:
        return {
            "metodo": "biseccion",
            "motivo": "La funcion puede tener zonas delicadas o derivadas inestables. Biseccion es la opcion mas robusta si elegis un intervalo con cambio de signo.",
            "advertencia": "Necesita un intervalo [a, b] donde f(a) y f(b) tengan signos opuestos.",
            "fuente": "heuristica_local",
        }

    if "cos" in texto or "sin" in texto or "exp" in texto:
        return {
            "metodo": "secante",
            "motivo": "La funcion parece suave y Secante suele converger rapido sin pedir derivada explicita.",
            "advertencia": "Necesita dos valores iniciales razonables x0 y x1.",
            "fuente": "heuristica_local",
        }

    if simbolos == {x}:
        try:
            derivada = sp.diff(expr, x)
            if derivada != 0:
                return {
                    "metodo": "newton",
                    "motivo": "La funcion es diferenciable y Newton suele ser el metodo mas rapido si elegis un buen punto inicial.",
                    "advertencia": "Evitalo si la derivada puede hacerse cero cerca del arranque.",
                    "fuente": "heuristica_local",
                }
        except Exception:
            pass

    return {
        "metodo": "biseccion",
        "motivo": "Sin mas informacion del intervalo o de un punto inicial, Biseccion es la recomendacion mas segura para empezar.",
        "advertencia": "Si luego tenes una buena semilla, Newton o Secante pueden converger mas rapido.",
        "fuente": "heuristica_local",
    }


def _buscar_intervalo_con_cambio_de_signo(expr):
    x = sp.Symbol("x")
    try:
        f = sp.lambdify(x, expr, "numpy")
    except Exception:
        return None

    candidatos = []
    valor = -10.0
    while valor < 10.0:
        candidatos.append(round(valor, 2))
        valor += 0.5

    anterior_x = None
    anterior_f = None
    for actual_x in candidatos:
        try:
            actual_f = float(f(actual_x))
        except Exception:
            anterior_x = None
            anterior_f = None
            continue

        if not math.isfinite(actual_f):
            anterior_x = None
            anterior_f = None
            continue

        if anterior_x is not None and anterior_f is not None and anterior_f * actual_f <= 0:
            return {
                "a": float(anterior_x),
                "b": float(actual_x),
                "x0": float((anterior_x + actual_x) / 2),
                "x1": float(actual_x),
            }

        anterior_x = actual_x
        anterior_f = actual_f

    return None


def _inferir_parametros(expr, metodo: str):
    intervalo = _buscar_intervalo_con_cambio_de_signo(expr)
    if intervalo:
        if metodo in {"biseccion", "regulafalsi"}:
            return {"a": intervalo["a"], "b": intervalo["b"]}
        if metodo == "secante":
            return {"x0": intervalo["a"], "x1": intervalo["b"]}
        if metodo == "newton":
            return {"x0": intervalo["x0"]}
        if metodo == "punto_fijo":
            return {"x0": intervalo["x0"]}

    return {
        "biseccion": {"a": -2.0, "b": 2.0},
        "regulafalsi": {"a": -2.0, "b": 2.0},
        "newton": {"x0": 1.0},
        "secante": {"x0": 0.0, "x1": 1.0},
        "punto_fijo": {"x0": 1.0},
    }.get(metodo, {})


def _mejorar_con_ia(funcion: str, recomendacion_local: dict):
    cliente = _obtener_cliente()
    if not cliente:
        return recomendacion_local

    try:
        respuesta = cliente.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=[
                PROMPT_RECOMENDACION,
                (
                    f"Ecuacion: {funcion}\n"
                    f"Sugerencia local inicial: {json.dumps(recomendacion_local, ensure_ascii=False)}\n"
                    "Ajusta la recomendacion si hace falta, pero mantente dentro de esos cinco metodos."
                ),
            ],
        )
        texto = _extraer_texto_respuesta(respuesta)
        data = json.loads(texto)
        metodo = data.get("metodo")
        if metodo not in {"biseccion", "regulafalsi", "newton", "secante", "punto_fijo"}:
            return recomendacion_local
        return {
            "metodo": metodo,
            "motivo": str(data.get("motivo") or recomendacion_local["motivo"]),
            "advertencia": str(data.get("advertencia") or recomendacion_local["advertencia"]),
            "parametros_sugeridos": data.get("parametros_sugeridos") or recomendacion_local.get("parametros_sugeridos") or {},
            "fuente": "ia",
        }
    except Exception:
        return recomendacion_local


def recomendar_metodo(funcion: str):
    try:
        expr = sp.sympify(funcion)
    except Exception as e:
        return {
            "exito": False,
            "mensaje": f"No se pudo analizar la funcion: {e}",
        }

    recomendacion_local = _motivo_local(expr, funcion)
    recomendacion_local["parametros_sugeridos"] = _inferir_parametros(expr, recomendacion_local["metodo"])
    recomendacion = _mejorar_con_ia(funcion, recomendacion_local)
    recomendacion["exito"] = True
    recomendacion["funcion_analizada"] = funcion
    return recomendacion
