/**
 * =============================================================================
 * LHL FESTAS — PROTEÇÃO DO ENDPOINT APPS SCRIPT (segredo compartilhado)
 * -----------------------------------------------------------------------------
 * A partir de agora o navegador NÃO chama mais o Apps Script.
 * Quem chama é a Server Function do Lovable Cloud, que envia o campo `gasToken`.
 *
 * PASSO 1 — No editor do Apps Script: Configurações do projeto →
 *           Propriedades do script → adicionar:
 *              GAS_SHARED_TOKEN = <um valor aleatório longo, ex.: 48 caracteres>
 * PASSO 2 — No Lovable: salvar o MESMO valor como secret `GAS_SHARED_TOKEN`.
 * PASSO 3 — Colar o trecho abaixo no Code.gs e inserir a validação no início
 *           de doGet e doPost (ver comentários).
 * =============================================================================
 */

function gasTokenValido_(e) {
  var esperado = PropertiesService.getScriptProperties().getProperty('GAS_SHARED_TOKEN');
  if (!esperado) return true; // enquanto a propriedade não existir, nada muda (compatibilidade)

  var recebido = '';
  try {
    if (e && e.parameter && e.parameter.gasToken) recebido = String(e.parameter.gasToken);
    if (!recebido && e && e.postData && e.postData.contents) {
      var body = JSON.parse(e.postData.contents);
      recebido = String(body.gasToken || '');
    }
  } catch (err) {
    recebido = '';
  }
  return recebido === esperado;
}

function gasNegado_() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: 'unauthorized' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * INSERIR COMO PRIMEIRA LINHA de doGet(e) E de doPost(e):
 *
 *   if (!gasTokenValido_(e)) return gasNegado_();
 *
 * Nada mais precisa ser alterado: todas as ações existentes continuam iguais.
 * IMPORTANTE: publique uma NOVA VERSÃO da implantação existente (mesma URL)
 * para que a alteração entre em vigor sem mudar nada no sistema.
 */
