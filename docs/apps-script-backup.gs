/**
 * =============================================================================
 * LHL FESTAS — BACKUP AUTOMÁTICO DA PLANILHA PRINCIPAL
 * -----------------------------------------------------------------------------
 * COLE ESTE TRECHO NO FINAL DO SEU Code.gs (não substitui nada existente).
 * Depois execute UMA VEZ a função `instalarGatilhoBackup()` no editor.
 * =============================================================================
 */

var BACKUP_FOLDER_NAME = 'LHL - Backups Automáticos';
var BACKUP_PREFIX = 'BACKUP LHL - ';
var BACKUP_RETENCAO = 30;          // manter apenas os 30 mais recentes
var BACKUP_HORA = 2;               // 02:00 da madrugada

/** Pasta de backups (cria se não existir). */
function backupFolder_() {
  var it = DriveApp.getFoldersByName(BACKUP_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(BACKUP_FOLDER_NAME);
}

/** Nome padrão: "BACKUP LHL - AAAA-MM-DD HH-mm" */
function backupNome_() {
  var tz = Session.getScriptTimeZone() || 'America/Sao_Paulo';
  return BACKUP_PREFIX + Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH-mm');
}

/** Registra o resultado na aba LOG_BACKUP (cria se não existir) + Logger. */
function backupLog_(status, id, mensagem) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('LOG_BACKUP');
    if (!sh) {
      sh = ss.insertSheet('LOG_BACKUP');
      sh.appendRow(['data', 'hora', 'status', 'idArquivo', 'mensagem']);
      sh.setFrozenRows(1);
    }
    var tz = Session.getScriptTimeZone() || 'America/Sao_Paulo';
    var agora = new Date();
    sh.appendRow([
      Utilities.formatDate(agora, tz, 'yyyy-MM-dd'),
      Utilities.formatDate(agora, tz, 'HH:mm:ss'),
      status,
      id || '',
      mensagem || ''
    ]);
  } catch (e) {
    Logger.log('Falha ao gravar LOG_BACKUP: ' + e);
  }
  Logger.log('[BACKUP] ' + status + ' ' + (id || '') + ' ' + (mensagem || ''));
}

/** Mantém apenas os N backups mais recentes DENTRO da pasta de backups. */
function backupLimpar_(folder) {
  var arquivos = [];
  var it = folder.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    // Só remove arquivos que sigam EXATAMENTE o padrão de backup.
    if (f.getName().indexOf(BACKUP_PREFIX) === 0) {
      arquivos.push({ file: f, date: f.getDateCreated() });
    }
  }
  arquivos.sort(function (a, b) { return b.date - a.date; });
  for (var i = BACKUP_RETENCAO; i < arquivos.length; i++) {
    try {
      arquivos[i].file.setTrashed(true);
    } catch (e) {
      Logger.log('Falha ao excluir backup antigo: ' + e);
    }
  }
  return Math.max(0, arquivos.length - BACKUP_RETENCAO);
}

/**
 * Cria uma CÓPIA INTEGRAL da planilha (abas, fórmulas, validações, filtros,
 * formatação e proteções) na pasta de backups e aplica a retenção.
 * Nunca lança exceção para fora: erros são apenas registrados.
 */
function backupPlanilha() {
  try {
    var origem = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
    var pasta = backupFolder_();
    var copia = origem.makeCopy(backupNome_(), pasta);
    var removidos = backupLimpar_(pasta);
    backupLog_('SUCESSO', copia.getId(), 'Backup criado. Excedentes removidos: ' + removidos);
    return copia.getId();
  } catch (e) {
    backupLog_('ERRO', '', String(e));
    return '';
  }
}

/** Executar UMA VEZ no editor para agendar o backup diário às 02:00. */
function instalarGatilhoBackup() {
  var jaExiste = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'backupPlanilha';
  });
  if (jaExiste) return 'Gatilho já instalado.';
  ScriptApp.newTrigger('backupPlanilha')
    .timeBased()
    .atHour(BACKUP_HORA)     // 02:00 (janela 02:00–03:00 definida pelo Google)
    .everyDays(1)
    .create();
  return 'Gatilho diário criado para ' + BACKUP_HORA + ':00.';
}

/** Remove o gatilho, se algum dia for necessário. */
function removerGatilhoBackup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'backupPlanilha') ScriptApp.deleteTrigger(t);
  });
  return 'Gatilho removido.';
}
