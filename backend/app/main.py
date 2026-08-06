from fastapi import FastAPI

app = FastAPI(title="HomeMesh API")


@app.get("/")
async def root():
    return {"message": "Welcome to HomeMesh"}