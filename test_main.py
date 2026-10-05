import pytest
from httpx import AsyncClient
from main import app, _parsear_json_com_latex  # Importa a instância do seu app FastAPI

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


def test_parsear_json_com_latex_preserva_fracoes():
    resposta = r'{"formula_velocidade":"v_m = \frac{\Delta s}{\Delta t}","formula_aceleracao":"a = \frac{\Delta v}{\Delta t}","formula_texto":"F = m \times a, \text{com } \beta = \nabla V"}'

    plano = _parsear_json_com_latex(resposta)

    assert plano["formula_velocidade"] == r"v_m = \frac{\Delta s}{\Delta t}"
    assert plano["formula_aceleracao"] == r"a = \frac{\Delta v}{\Delta t}"
    assert plano["formula_texto"] == r"F = m \times a, \text{com } \beta = \nabla V"


def test_parsear_json_com_latex_preserva_quebra_de_linha_json():
    plano = _parsear_json_com_latex(r'{"descricao":"linha 1\nlinha 2"}')

    assert plano["descricao"] == "linha 1\nlinha 2"