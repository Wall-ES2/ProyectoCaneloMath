import sympy as sp
import numpy as np

def newthon_raphson(funcion_str: str, x0: float, tol: float=1e-10, max_iter: int=100 ):
    x = sp.Symbol('x') #Convierte a x de texto a una variable matematica real
    try:
        #Convertir texto a matematica.
        f_expr = sp.sympify(funcion_str)

        #Calcular la derivada
        df_expr = sp.diff(f_expr, x)
    except Exception as e:
        return {"exito": False, "mensaje": f"Error al procesar la funcion: {str(e)}"}

    #Convertir a funciones evaluables numericamente (MUY RAPIDO)

    f = sp.lambdify(x, f_expr, 'numpy')
    df = sp.lambdify(x, df_expr, 'numpy')

    iteraciones = []
    xi = x0

    for i in range (1, max_iter + 1):
        #Evaluar la derivada de la funcion en el punto.
        f_xi = float(f(xi))
        df_xi = float(df(xi))

        if df_xi == 0:
            return {
                "exito": False,
                "mensaje": "La derivada se hizo cero. El metodo falla",
                "iteraciones": iteraciones
            }
        
        #Formula de Newthon-Raphson
        xi_next = xi - (f_xi/df_xi)
    
        #Calcular el error absoluto
        error = abs(xi_next - xi)

        #Guardar los datos de la iteracion
        iteraciones.append({
            "iteracion": i,
            "xi": xi,
            "f_xi": f_xi,
            "df_xi": df_xi,
            "error": error
        })

        #Criterio de paro
        if error < tol:
            return {
                "exito": True,
                "raiz": xi_next,
                "iteraciones": iteraciones
            }
        
        #Preparar la siguiente vuelta
        xi = xi_next
    
    #Si terminan todas las vueltas y no convergio
    return {
        "exito": False,
        "mensaje": "El método no convergió en el número máximo de iteraciones.",
        "iteraciones": iteraciones
    }

def biseccion(funcion_str: str, a: float, b: float, tol: float=1e-10, max_iter: int=100):
    
    x = sp.Symbol('x')
    try:
        f_expr = sp.sympify(funcion_str)
    except Exception as e:
        return {"exito": False, "mensaje": f"Error al procesar la función: {str(e)}"}

    f = sp.lambdify(x,f_expr, 'numpy')

    #Evaluacion de los extremos

    f_a = float(f(a))
    f_b = float(f(b))

    if f_a*f_b >= 0:
        return {
            "exito":False,
            "mensaje": f"No hay cambio de signo entre f({a})={f_a} y f({b})={f_b}. La raíz no está garantizada aquí.",
            "iteraciones": []
        }
    
    iteraciones = []

    for i in range(1, max_iter+1):

        #Cortar a la mitad
        c = (a+b)/2.0
        f_c = float(f(c))

        #Calcular el error
        error = (b-a)/2.0

        iteraciones.append({
            "iteracion": i,
            "a": a,
            "b": b,
            "c": c,
            "f_c": f_c,
            "error": error
        })

        #Criterio de paro
        if error < tol or f_c == 0:
            return{
                "exito": True,
                "raiz": c,
                "iteraciones": iteraciones
            }
        
        #Decidir que mitad descartar para la siguiente vuelta
        if f_a*f_c < 0:
            b=c
            f_b=f_c
        else:
            a=c
            f_a=f_c
    
    return {
        "exito": False,
        "mensaje": "El método no convergió en el máximo de iteraciones.",
        "iteraciones": iteraciones
    }

def regula_falsi(funcion_str: str, a: float, b: float, tol: float=1e-10, max_iter: int=100):
    x = sp.Symbol('x')

    try:
        f_expr = sp.sympify(funcion_str)
    except Exception as e:
        return {
            "exito": False,
            "Mensaje": f"Error al procesar la función: {str(e)}"
        }
    
    f = sp.lambdify(x,f_expr,'numpy')

    f_a = float(f(a))
    f_b = float(f(b))

    if f_a*f_b >= 0:
        return{
            "exito": False,
            "mensaje": "No hay cambio de signo. El método Regula Falsi requiere que la raíz esté acorralada.",
            "iteraciones": []
        }
    
    iteraciones = []
    c_old = a

    for i in range(1, max_iter+1):
        
        #Formula RegulaFalsi
        c = b-(f_b* (a-b))/(f_a - f_b)
        f_c = float(f(c))

        #Error
        if i==1:
            error = abs(c-a)
        else:
            error = abs(c-c_old)

        iteraciones.append({
            "iteracion": i,
            "a": a,
            "b": b,
            "c": c,
            "f_c": f_c,
            "error": error
        })

        if error < tol or f_c == 0:
            return {
                "exito": True,
                "raiz": c,
                "iteraciones": iteraciones
            }
        if f_a * f_c < 0:
            b = c
            f_b = f_c
        else:
            a = c
            f_a = f_c

        #Actualizar c_old para la siguiente vuelta
        c_old = c

    return {
        "exito": False,
        "mensaje": "El método no convergió en el máximo de iteraciones.",
        "iteraciones": iteraciones        
    }

def secante(funcion_str: str, x0: float, x1: float, tol: float=1e-10, max_iter: int=100):

    x = sp.Symbol('x')

    try:
        f_expr = sp.sympify(funcion_str)
    except Exception as e:
        return{
            "exito": False,
            "mensaje": f"Error al procesar la función: {str(e)}"
        }
    
    f = sp.lambdify(x,f_expr,'numpy')
    iteraciones = []

    for i in range(1,max_iter+1):
        f_x0 = float(f(x0))
        f_x1 = float(f(x1))

        if f_x1 - f_x0 == 0:
            return {
                "exito": False, 
                "mensaje": "División por cero. Los puntos tienen la misma altura.",
                "iteraciones": iteraciones
            }
        
        #Formula de la secante
        x2 = x1 - (f_x1 * (x1-x0)) / (f_x1-f_x0)
        f_x2 = float(f(x2))

        #Error
        error = abs(x2-x1)

        iteraciones.append({
            "iteracion": i,
            "x0": x0,
            "x1": x1,
            "x2": x2,
            "f_x2": f_x2,
            "error": error
        })

        if error < tol or f_x2 == 0:
            return{
                "exito": True,
                "raiz": x2,
                "iteraciones": iteraciones
            }

        #Avanzar en fila india
        x0 = x1
        x1 = x2

    return {
        "exito": False,
        "mensaje": "El método no convergió.",
        "iteraciones": iteraciones
    }

def punto_fijo(funcion_g_str: str, x0: float, tol: float=1e-10, max_iter: int=100):
    x = sp.Symbol('x')
    
    try:
        # Aquí procesamos g(x) en lugar de f(x)
        g_expr = sp.sympify(funcion_g_str)
    except Exception as e:
        return {"exito": False, "mensaje": f"Error al procesar la función: {str(e)}"}

    g = sp.lambdify(x, g_expr, 'numpy')

    iteraciones = []
    xi = x0

    for i in range(1, max_iter + 1):
        try:
            # Evaluamos xi en la función g(x)
            xi_next = float(g(xi))
        except OverflowError:
            return {
                "exito": False, 
                "mensaje": "El cálculo se desbordó (divergencia infinita). La función g(x) elegida no es válida para este punto inicial.",
                "iteraciones": iteraciones
            }

        # El error es simplemente cuánto nos movimos desde el paso anterior
        error = abs(xi_next - xi)

        iteraciones.append({
            "iteracion": i,
            "xi": xi,
            "g_xi": xi_next,
            "error": error
        })

        if error < tol:
            return {
                "exito": True,
                "raiz": xi_next,
                "iteraciones": iteraciones
            }

        # El resultado actual es la entrada de la siguiente vuelta
        xi = xi_next

    return {
        "exito": False,
        "mensaje": "El método no convergió. Los valores probablemente están rebotando (divergencia).",
        "iteraciones": iteraciones
    }
