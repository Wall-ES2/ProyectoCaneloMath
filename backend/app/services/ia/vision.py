import io
import os
import re
import shutil

from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image, ImageOps, UnidentifiedImageError

load_dotenv()

PROMPT_ESTRICTO = """
Eres un experto analizador matematico. Tu unica tarea es extraer la ecuacion de la imagen.
Reglas ESTRICTAS:
1. Devuelve SOLO la funcion principal en formato Python/SymPy.
2. Usa '**' para potencias (ejemplo: x**2 + 3*x - 4).
3. Usa 'sqrt()' para raices cuadradas, 'sin()' para seno, etc.
4. Si hay un '= 0', ignoralo y devuelve solo la parte izquierda.
5. No pongas y= ni f(x)=, solo la ecuacion.
6. No uses formato Markdown ni comillas.
7. No saludes ni expliques. Solo devuelve la formula.
Si la imagen no tiene una ecuacion matematica clara, devuelve la palabra: ERROR
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


def _normalizar_ecuacion(ecuacion: str) -> str:
    ecuacion = ecuacion.strip().strip("`")
    if ecuacion.lower().startswith("f(x)="):
        ecuacion = ecuacion[5:].strip()
    if ecuacion.lower().startswith("y="):
        ecuacion = ecuacion[2:].strip()
    if "=" in ecuacion:
        izquierda, derecha = [p.strip() for p in ecuacion.split("=", 1)]
        if derecha in {"0", "0.0"}:
            ecuacion = izquierda
    return ecuacion


def _mensaje_cuota_agotada(error_texto: str) -> str:
    retry_match = re.search(r"retry in ([0-9]+(?:\.[0-9]+)?)s", error_texto, flags=re.IGNORECASE)
    retry_txt = ""
    if retry_match:
        segundos = int(round(float(retry_match.group(1))))
        retry_txt = f" Reintenta en ~{segundos}s."

    if "limit: 0" in error_texto or "free_tier" in error_texto.lower():
        return (
            "Tu API key de Gemini no tiene cuota disponible (limit: 0 en free tier). "
            "Activa billing en Google AI Studio o usa otra API key con cuota habilitada."
            f"{retry_txt}"
        )

    return f"Se excedio la cuota de Gemini para este proyecto/API key.{retry_txt}"


SUPERSCRIPT_A_NUM = {
    "\u2070": "0",
    "\u00B9": "1",
    "\u00B2": "2",
    "\u00B3": "3",
    "\u2074": "4",
    "\u2075": "5",
    "\u2076": "6",
    "\u2077": "7",
    "\u2078": "8",
    "\u2079": "9",
}


def _heuristica_cuadrado_perdido(ecuacion: str) -> str:
    # Caso comun de OCR: "x + 3*x - 10" en lugar de "x**2 + 3*x - 10".
    # Solo corrige cuando hay al menos dos x y no hay potencias explicitas.
    if not ecuacion:
        return ecuacion
    if "**" in ecuacion or "^" in ecuacion:
        return ecuacion

    xs = re.findall(r"x", ecuacion, flags=re.IGNORECASE)
    if len(xs) < 2:
        return ecuacion

    if re.match(r"^\s*x\s*[\+\-]", ecuacion):
        return re.sub(r"^\s*x\b", "x**2", ecuacion, count=1, flags=re.IGNORECASE)
    return ecuacion


def _limpiar_texto_ocr(texto: str) -> str:
    t = (texto or "").strip()
    if not t:
        return ""
    t = t.replace("\n", " ").replace("\r", " ")
    t = t.replace("\u00D7", "*").replace("\u00B7", "*").replace("\u00F7", "/")
    t = t.replace("\u2212", "-").replace("\u2013", "-").replace("\u2014", "-")
    t = t.replace("\u221A", "sqrt")
    t = t.replace("X", "x")
    t = re.sub(r"[\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079]+", lambda m: "**" + "".join(SUPERSCRIPT_A_NUM[c] for c in m.group(0)), t)
    t = re.sub(r"\^(\d+)", r"**\1", t)
    # En OCR, "x2" suele venir de "x^2" o "x²": lo tratamos como potencia.
    t = re.sub(r"x(\d+)", r"x**\1", t)
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"[^a-zA-Z0-9_+\-*/().=^ ]", "", t)
    t = re.sub(r"(\d)(x)", r"\1*\2", t)
    t = _normalizar_ecuacion(t)
    t = _heuristica_cuadrado_perdido(t)
    return t


def _parece_ecuacion_valida(ecuacion: str) -> bool:
    if not ecuacion:
        return False
    if len(ecuacion) < 3:
        return False
    tiene_variable = "x" in ecuacion.lower()
    tiene_operador = any(op in ecuacion for op in ["+", "-", "*", "/", "^", "**", "sqrt", "sin", "cos", "tan", "log", "ln", "exp"])
    return tiene_variable and tiene_operador


def _resolver_tesseract_cmd() -> str | None:
    cmd = os.getenv("TESSERACT_CMD")
    if cmd and os.path.exists(cmd):
        return cmd

    cmd = shutil.which("tesseract")
    if cmd:
        return cmd

    for candidato in (
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ):
        if os.path.exists(candidato):
            return candidato

    return None


def _intentar_ocr_local(imagen_bytes: bytes):
    try:
        import pytesseract
    except Exception:
        return None, "OCR local no disponible: instala 'pytesseract' y Tesseract OCR."

    tesseract_cmd = _resolver_tesseract_cmd()
    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    try:
        _ = pytesseract.get_tesseract_version()
    except Exception:
        return None, "OCR local no disponible: no se encontro el ejecutable de Tesseract. Instala Tesseract o configura TESSERACT_CMD."

    try:
        img = Image.open(io.BytesIO(imagen_bytes)).convert("L")
        img = ImageOps.autocontrast(img)
        img = img.point(lambda p: 255 if p > 160 else 0)
        configs = [
            "--oem 3 --psm 6",
            "--oem 3 --psm 7",
        ]
        candidatos = []
        for cfg in configs:
            texto = pytesseract.image_to_string(img, config=cfg)
            candidatos.append(texto)

        for crudo in candidatos:
            ecuacion = _limpiar_texto_ocr(crudo)
            if _parece_ecuacion_valida(ecuacion):
                return ecuacion, None

        return None, "OCR local no pudo detectar una ecuacion clara en la imagen."
    except Exception as e:
        return None, f"OCR local fallo: {e}"


def extraer_ecuacion_de_imagen(imagen_bytes: bytes):
    try:
        imagen = Image.open(io.BytesIO(imagen_bytes))
        imagen.verify()
        formato = (imagen.format or "PNG").upper()
        mime_type = Image.MIME.get(formato, "image/png")
    except UnidentifiedImageError:
        return {"exito": False, "mensaje": "El archivo subido no es una imagen valida."}
    except Exception as e:
        return {"exito": False, "mensaje": f"No se pudo leer la imagen: {e}"}

    cliente = _obtener_cliente()
    if not cliente:
        ecuacion_local, error_local = _intentar_ocr_local(imagen_bytes)
        if ecuacion_local:
            return {"exito": True, "ecuacion": ecuacion_local, "fuente": "ocr_local"}
        return {
            "exito": False,
            "mensaje": f"Falta configurar GEMINI_API_KEY/GOOGLE_API_KEY. {error_local}",
        }

    parte_imagen = types.Part.from_bytes(data=imagen_bytes, mime_type=mime_type)

    modelos_candidatos = [
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
    ]
    ultimo_error = None

    for modelo in modelos_candidatos:
        try:
            respuesta = cliente.models.generate_content(
                model=modelo,
                contents=[PROMPT_ESTRICTO, parte_imagen],
            )
            ecuacion = _extraer_texto_respuesta(respuesta)
            ecuacion = _normalizar_ecuacion(ecuacion)

            if not ecuacion or "ERROR" in ecuacion.upper():
                return {
                    "exito": False,
                    "mensaje": "La IA no pudo encontrar una ecuacion matematica clara en la imagen.",
                }
            return {"exito": True, "ecuacion": ecuacion}
        except Exception as e:
            error_texto = str(e)
            if "RESOURCE_EXHAUSTED" in error_texto or "429" in error_texto:
                ecuacion_local, error_local = _intentar_ocr_local(imagen_bytes)
                if ecuacion_local:
                    return {
                        "exito": True,
                        "ecuacion": ecuacion_local,
                        "fuente": "ocr_local",
                        "mensaje": "Gemini sin cuota. Se uso OCR local.",
                    }
                return {"exito": False, "mensaje": f"{_mensaje_cuota_agotada(error_texto)} {error_local}"}
            ultimo_error = e
            continue

    ecuacion_local, error_local = _intentar_ocr_local(imagen_bytes)
    if ecuacion_local:
        return {
            "exito": True,
            "ecuacion": ecuacion_local,
            "fuente": "ocr_local",
            "mensaje": "Gemini no disponible. Se uso OCR local.",
        }
    return {"exito": False, "mensaje": f"Fallo en Gemini: {ultimo_error}. {error_local}"}
