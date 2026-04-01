from fastapi import FastAPI #Sirve para recibir peticiones HTTP y devolver respuestas
from fastapi.middleware.cors import CORSMiddleware #Seguridad
from app.api.rutas import router

#Usamos el plano FastAPI
app = FastAPI(
    title="API Calculadora analisis numerico", 
    version="1.0"
)

#Seguridad sirve para poder combinar el frontend con el backend por mas que esten corriendo
#en puertos distintos, sirve como intermediarion en las peticiones
app.add_middleware( 
    CORSMiddleware,
    allow_origins=["*"], #Recibir peticiones de cierto lado ("*" para aceptar todo)
    allow_credentials=True,
    allow_methods=["*"], #Permite recibir cualquier accion (GET,POST,DELETE)
    allow_headers=["*"], #Permite que traiga cualquier informacion oculta (Imagenes de IA)
    )

app.include_router(router)

@app.get("/")
def home():
    return {"Mensaje": "¡El motor matemático está encendido!"}