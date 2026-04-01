from fastapi import APIRouter, File, UploadFile
from app.models.esquemas import PeticionNewton, PeticionBiseccion, PeticionRegulaFalsi, PeticionSecante, PeticionPuntoFijo
from app.services.metodos_numericos import newthon_raphson, biseccion, regula_falsi, secante, punto_fijo
from app.services.ia.vision import extraer_ecuacion_de_imagen

router = APIRouter()

@router.post("/calcular/biseccion")
def calcular_biseccion(datos: PeticionBiseccion):
    resultado = biseccion(
        funcion_str=datos.funcion,
        a=datos.a,
        b=datos.b,
        tol=datos.tolerancia,
        max_iter=datos.max_iteraciones
    )
    return resultado

@router.post("/calcular/regulafalsi")
def calcular_regulafalsi(datos: PeticionRegulaFalsi):
    resultados = regula_falsi(
        funcion_str=datos.funcion,
        a=datos.a,
        b=datos.b,
        tol=datos.tolerancia,
        max_iter=datos.max_iteraciones
    )
    return resultados

@router.post("/calcular/punto-fijo")
def calcular_punto_fijo(datos: PeticionPuntoFijo):
    resultado = punto_fijo(
        funcion_g_str=datos.funcion_g,
        x0=datos.x0,
        tol=datos.tolerancia,
        max_iter=datos.max_iteraciones
    )
    return resultado

@router.post("/calcular/newton")
def calcular_newton(datos: PeticionNewton):
    resultado = newthon_raphson(
        funcion_str=datos.funcion,
        x0=datos.punto_inicial,
        tol=datos.tolerancia,
        max_iter=datos.max_iteraciones
    )
    return resultado

@router.post("/calcular/secante")
def calcular_secante(datos: PeticionSecante):
    resultado = secante(
        funcion_str=datos.funcion,
        x0=datos.x0,
        x1=datos.x1,
        tol=datos.tolerancia,
        max_iter=datos.max_iteraciones
    )
    return resultado

@router.post("/ia/analizar-foto")
async def analizar_foto(file: UploadFile = File(...)):  #async para que cuando se carga la imagen las demas funciones no se queden colgadas esperando a que termine esta
    #Leer los datos crudos de la foto
    contenido_bytes = await file.read()

    #Envio a gemini
    resultado = extraer_ecuacion_de_imagen(contenido_bytes)

    #Devolvemos la ecuacion extraida (O el mensaje de error)
    return resultado