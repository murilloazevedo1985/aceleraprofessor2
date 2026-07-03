import pytest
from httpx import AsyncClient
from main import app  # Importa a instância do seu app FastAPI

# Marca todos os testes neste arquivo para serem executados de forma assíncrona com pytest-asyncio
pytestmark = pytest.mark.asyncio

async def test_health_check():
    """
    Testa se o endpoint /health responde com status 200 e o JSON correto.
    """
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}