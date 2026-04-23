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


def secante(funcion_str: str, x0: float, x1: float, tol: float=1e-10, max_iter: int=100):
    x = sp.Symbol('x')

    try:
        f_expr = sp.sympify(funcion_str)
    except Exception as e:
        return {
            "exito": False,
            "mensaje": f"Error al procesar la función: {str(e)}"
        }
    
    f = sp.lambdify(x, f_expr, 'numpy')
    
    # --- ALGORITMO DE BARRIDO (SWEEPING) ---
    min_x = min(x0, x1)
    max_x = max(x0, x1)
    
    # Hacemos el barrido dinámico: 1000 pasos por CADA unidad de distancia.
    # Si la distancia es 11 (de -5 a 6), dará 11,000 pasos.
    # El tamaño del paso ahora será 0.001 (infinitamente menor a 0.0314, ¡no se nos escapará ninguna raíz!)
    distancia = max_x - min_x
    pasos = int(distancia * 1000) 
    
    # Para evitar que el usuario ponga (x0=1, x1=1.001) y pasos quede en 0, ponemos un mínimo de 200
    if pasos < 200:
        pasos = 200
        
    puntos_escaneo = np.linspace(min_x, max_x, pasos)
    
    raices_encontradas = []
    iteraciones_globales = []

    # Cazamos cambios de signo a lo largo del intervalo
    for i in range(len(puntos_escaneo) - 1):
        p_actual = puntos_escaneo[i]
        p_siguiente = puntos_escaneo[i+1]
        
        f_actual = float(f(p_actual))
        f_siguiente = float(f(p_siguiente))
        
        # Si hay cambio de signo, atrapamos la raíz ejecutando Secante Clásica
        if f_actual * f_siguiente <= 0:
            x_prev = p_actual
            x_curr = p_siguiente
            
            iter_locales = []
            raiz_local = None
            
            for step in range(1, max_iter + 1):
                fx_curr = float(f(x_curr))
                fx_prev = float(f(x_prev))
                
                # Evitar división por cero
                if fx_curr - fx_prev == 0:
                    break 
                
                # Fórmula clásica de la Secante
                x_next = x_curr - (fx_curr * (x_curr - x_prev)) / (fx_curr - fx_prev)
                fx_next = float(f(x_next))
                error = abs(x_next - x_curr)
                
                iter_locales.append({
                    "iteracion": step,
                    "x0": x_prev,
                    "x1": x_curr,
                    "x2": x_next,
                    "f_x2": fx_next,
                    "error": error
                })
                
                # Criterio de parada
                if error < tol or fx_next == 0:
                    raiz_local = x_next
                    break
                    
                x_prev = x_curr
                x_curr = x_next
            
            # Verificamos que la raíz no sea un duplicado de otra cercana
            if raiz_local is not None:
                es_duplicada = any(abs(r - raiz_local) < 1e-4 for r in raices_encontradas)
                if not es_duplicada:
                    raices_encontradas.append(raiz_local)
                    iteraciones_globales.append(iter_locales)

    # Si el barrido falló (porque el usuario puso puntos muy cercanos y no cortan el cero),
    # ejecutamos la Secante pura por defecto
    if len(raices_encontradas) == 0:
        x_prev = x0
        x_curr = x1
        iter_locales = []
        
        for step in range(1, max_iter + 1):
            fx_curr = float(f(x_curr))
            fx_prev = float(f(x_prev))
            
            if fx_curr - fx_prev == 0:
                return {"exito": False, "mensaje": "División por cero. Los puntos tienen igual altura.", "iteraciones": iter_locales}
            
            x_next = x_curr - (fx_curr * (x_curr - x_prev)) / (fx_curr - fx_prev)
            fx_next = float(f(x_next))
            error = abs(x_next - x_curr)
            
            iter_locales.append({
                "iteracion": step, "x0": x_prev, "x1": x_curr, "x2": x_next, "f_x2": fx_next, "error": error
            })
            
            if error < tol or fx_next == 0:
                return {"exito": True, "raiz": x_next, "iteraciones": iter_locales}
                
            x_prev = x_curr
            x_curr = x_next
            
        return {"exito": False, "mensaje": "El método no convergió.", "iteraciones": iter_locales}

    # Si todo salió bien, devolvemos múltiples raíces
    return {
        "exito": True,
        "raices": raices_encontradas,
        "iteraciones_por_raiz": iteraciones_globales
    }

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
