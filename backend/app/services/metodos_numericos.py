import sympy as sp
import numpy as np


def _agregar_raiz_si_nueva(raices, candidato, tol_duplicado=1e-6):
    for raiz in raices:
        if abs(raiz - candidato) <= tol_duplicado:
            return
    raices.append(candidato)


def _detectar_candidatos_en_rango(f, a, b, muestras=500, tol_cero=1e-7):
    if a > b:
        a, b = b, a

    xs = np.linspace(a, b, muestras)
    puntos_clave = np.array([a, b, (a + b) / 2.0, 0.0], dtype=float)
    xs = np.concatenate([xs, puntos_clave[(puntos_clave >= a) & (puntos_clave <= b)]])
    xs = np.unique(np.sort(xs))
    intervalos = []
    raices_directas = []

    x_prev = None
    f_prev = None
    for x in xs:
        try:
            fx = float(f(x))
        except Exception:
            x_prev = None
            f_prev = None
            continue

        if not np.isfinite(fx):
            x_prev = None
            f_prev = None
            continue

        if abs(fx) <= tol_cero:
            _agregar_raiz_si_nueva(raices_directas, float(x), tol_duplicado=tol_cero * 20)

        if x_prev is not None and f_prev is not None and f_prev * fx < 0:
            intervalos.append((float(x_prev), float(x)))

        x_prev = x
        f_prev = fx

    return intervalos, raices_directas


def _biseccion_intervalo(f, a, b, tol=1e-10, max_iter=100):
    f_a = float(f(a))
    f_b = float(f(b))
    if f_a * f_b > 0:
        return None, []

    iteraciones = []
    c = a
    for i in range(1, max_iter + 1):
        c = (a + b) / 2.0
        f_c = float(f(c))
        error = abs((b - a) / 2.0)
        iteraciones.append({
            "iteracion": i,
            "a": a,
            "b": b,
            "c": c,
            "f_c": f_c,
            "error": error,
        })
        if error < tol or abs(f_c) <= tol:
            return c, iteraciones
        if f_a * f_c < 0:
            b = c
            f_b = f_c
        else:
            a = c
            f_a = f_c

    return c, iteraciones


def _regulafalsi_intervalo(f, a, b, tol=1e-10, max_iter=100):
    f_a = float(f(a))
    f_b = float(f(b))
    if f_a * f_b > 0:
        return None, []

    iteraciones = []
    c_old = a
    c = a

    for i in range(1, max_iter + 1):
        denom = (f_a - f_b)
        if denom == 0:
            return None, iteraciones

        c = b - (f_b * (a - b)) / denom
        f_c = float(f(c))
        error = abs(c - a) if i == 1 else abs(c - c_old)

        iteraciones.append({
            "iteracion": i,
            "a": a,
            "b": b,
            "c": c,
            "f_c": f_c,
            "error": error,
        })

        if error < tol or abs(f_c) <= tol:
            return c, iteraciones

        if f_a * f_c < 0:
            b = c
            f_b = f_c
        else:
            a = c
            f_a = f_c

        c_old = c

    return c, iteraciones


def newthon_raphson(funcion_str: str, x0: float, tol: float = 1e-10, max_iter: int = 100):
    x = sp.Symbol("x")
    try:
        f_expr = sp.sympify(funcion_str)
        df_expr = sp.diff(f_expr, x)
    except Exception as e:
        return {"exito": False, "mensaje": f"Error al procesar la funcion: {str(e)}"}

    f = sp.lambdify(x, f_expr, "numpy")
    df = sp.lambdify(x, df_expr, "numpy")

    iteraciones = []
    xi = x0

    for i in range(1, max_iter + 1):
        f_xi = float(f(xi))
        df_xi = float(df(xi))

        if df_xi == 0:
            return {
                "exito": False,
                "mensaje": "La derivada se hizo cero. El metodo falla",
                "iteraciones": iteraciones,
            }

        xi_next = xi - (f_xi / df_xi)
        error = abs(xi_next - xi)

        iteraciones.append({
            "iteracion": i,
            "xi": xi,
            "f_xi": f_xi,
            "df_xi": df_xi,
            "error": error,
        })

        if error < tol:
            return {"exito": True, "raiz": xi_next, "iteraciones": iteraciones}

        xi = xi_next

    return {
        "exito": False,
        "mensaje": "El metodo no convergio en el numero maximo de iteraciones.",
        "iteraciones": iteraciones,
    }


def biseccion(funcion_str: str, a: float, b: float, tol: float = 1e-10, max_iter: int = 100):
    x = sp.Symbol("x")
    try:
        f_expr = sp.sympify(funcion_str)
    except Exception as e:
        return {"exito": False, "mensaje": f"Error al procesar la funcion: {str(e)}"}

    f = sp.lambdify(x, f_expr, "numpy")

    intervalos, raices_directas = _detectar_candidatos_en_rango(f, a, b, muestras=700, tol_cero=max(tol * 10, 1e-7))
    raices = []
    iteraciones_por_raiz = []

    for r in raices_directas:
        _agregar_raiz_si_nueva(raices, float(r), tol_duplicado=max(tol * 50, 1e-5))

    for ai, bi in intervalos:
        raiz, iters = _biseccion_intervalo(f, ai, bi, tol=tol, max_iter=max_iter)
        if raiz is not None:
            _agregar_raiz_si_nueva(raices, float(raiz), tol_duplicado=max(tol * 50, 1e-5))
            iteraciones_por_raiz.append(iters)

    if not raices:
        return {
            "exito": False,
            "mensaje": "No se detectaron raices en el rango seleccionado.",
            "iteraciones": [],
        }

    raices_ordenadas = sorted(raices)
    return {
        "exito": True,
        "raiz": raices_ordenadas[0],
        "raices": raices_ordenadas,
        "iteraciones": iteraciones_por_raiz[0] if iteraciones_por_raiz else [],
        "iteraciones_por_raiz": iteraciones_por_raiz,
        "mensaje": f"Se detectaron {len(raices_ordenadas)} raiz(ces) en el rango.",
    }


def regula_falsi(funcion_str: str, a: float, b: float, tol: float = 1e-10, max_iter: int = 100):
    x = sp.Symbol("x")

    try:
        f_expr = sp.sympify(funcion_str)
    except Exception as e:
        return {"exito": False, "mensaje": f"Error al procesar la funcion: {str(e)}"}

    f = sp.lambdify(x, f_expr, "numpy")

    intervalos, raices_directas = _detectar_candidatos_en_rango(f, a, b, muestras=700, tol_cero=max(tol * 10, 1e-7))
    raices = []
    iteraciones_por_raiz = []

    for r in raices_directas:
        _agregar_raiz_si_nueva(raices, float(r), tol_duplicado=max(tol * 50, 1e-5))

    for ai, bi in intervalos:
        raiz, iters = _regulafalsi_intervalo(f, ai, bi, tol=tol, max_iter=max_iter)
        if raiz is not None:
            _agregar_raiz_si_nueva(raices, float(raiz), tol_duplicado=max(tol * 50, 1e-5))
            iteraciones_por_raiz.append(iters)

    if not raices:
        return {
            "exito": False,
            "mensaje": "No se detectaron raices en el rango seleccionado.",
            "iteraciones": [],
        }

    raices_ordenadas = sorted(raices)
    return {
        "exito": True,
        "raiz": raices_ordenadas[0],
        "raices": raices_ordenadas,
        "iteraciones": iteraciones_por_raiz[0] if iteraciones_por_raiz else [],
        "iteraciones_por_raiz": iteraciones_por_raiz,
        "mensaje": f"Se detectaron {len(raices_ordenadas)} raiz(ces) en el rango.",
    }


def secante(funcion_str: str, x0: float, x1: float, tol: float = 1e-10, max_iter: int = 100):
    x = sp.Symbol("x")

    try:
        f_expr = sp.sympify(funcion_str)
    except Exception as e:
        return {"exito": False, "mensaje": f"Error al procesar la funcion: {str(e)}"}

    f = sp.lambdify(x, f_expr, "numpy")
    iteraciones = []

    for i in range(1, max_iter + 1):
        f_x0 = float(f(x0))
        f_x1 = float(f(x1))

        if f_x1 - f_x0 == 0:
            return {
                "exito": False,
                "mensaje": "Division por cero. Los puntos tienen la misma altura.",
                "iteraciones": iteraciones,
            }

        x2 = x1 - (f_x1 * (x1 - x0)) / (f_x1 - f_x0)
        f_x2 = float(f(x2))
        error = abs(x2 - x1)

        iteraciones.append({
            "iteracion": i,
            "x0": x0,
            "x1": x1,
            "x2": x2,
            "f_x2": f_x2,
            "error": error,
        })

        if error < tol or abs(f_x2) <= tol:
            return {"exito": True, "raiz": x2, "iteraciones": iteraciones}

        x0 = x1
        x1 = x2

    return {"exito": False, "mensaje": "El metodo no convergio.", "iteraciones": iteraciones}


def punto_fijo(funcion_g_str: str, x0: float, tol: float = 1e-10, max_iter: int = 100):
    x = sp.Symbol("x")

    try:
        g_expr = sp.sympify(funcion_g_str)
    except Exception as e:
        return {"exito": False, "mensaje": f"Error al procesar la funcion: {str(e)}"}

    g = sp.lambdify(x, g_expr, "numpy")

    iteraciones = []
    xi = x0

    for i in range(1, max_iter + 1):
        try:
            xi_next = float(g(xi))
        except OverflowError:
            return {
                "exito": False,
                "mensaje": "El calculo se desbordo (divergencia infinita). La funcion g(x) elegida no es valida para este punto inicial.",
                "iteraciones": iteraciones,
            }

        error = abs(xi_next - xi)

        iteraciones.append({
            "iteracion": i,
            "xi": xi,
            "g_xi": xi_next,
            "error": error,
        })

        if error < tol:
            return {"exito": True, "raiz": xi_next, "iteraciones": iteraciones}

        xi = xi_next

    return {
        "exito": False,
        "mensaje": "El metodo no convergio. Los valores probablemente estan rebotando (divergencia).",
        "iteraciones": iteraciones,
    }
