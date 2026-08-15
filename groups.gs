// ==========================
// Grupos
// ==========================

const GROUPS_SHEET_NAME = "Grupos";
const GROUPS_HEADERS = ["id", "nombre", "miembros", "createdAt"];
const GROUP_RECORD_TEMPLATE_SHEET = "Perenquenes";

const LEGACY_GROUPS = [
  {
    id: "grp_001_perenquenes",
    nombre: "Perenquenes",
    miembros: ["Ana", "Iván", "Luis", "Breo"]
  },
  {
    id: "grp_002_comandocafe",
    nombre: "Comando Café",
    miembros: ["Elena", "Monje", "Breo"]
  },
  {
    id: "grp_003_naigan",
    nombre: "Naigan",
    miembros: ["Breo", "Naira"]
  }
];


function isGroupsRoute_(e) {
  return e &&
    e.parameter &&
    e.parameter.action === "groups";
}


function getGroupsResponse_(e) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateGroupsSheet_(spreadsheet);

  if (sheet.getLastRow() < 2) {
    return groupsGetResponse_(LEGACY_GROUPS, e);
  }

  const rows = sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      GROUPS_HEADERS.length
    )
    .getValues();

  const groups = rows
    .filter(row => row[0] && row[1])
    .map(row => ({
      id: String(row[0]),
      nombre: String(row[1]),
      miembros: parseMembers_(row[2])
    }))
    .filter(group => group.miembros.length >= 2);

  return groupsGetResponse_(groups, e);
}


function groupsGetResponse_(data, e) {
  const callback = e && e.parameter
    ? String(e.parameter.callback || "")
    : "";

  if (/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService
      .createTextOutput(
        `${callback}(${JSON.stringify(data)})`
      )
      .setMimeType(
        ContentService.MimeType.JAVASCRIPT
      );
  }

  return groupsJsonResponse_(data);
}


function createGroupResponse_(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    const payload = JSON.parse(
      (e.postData && e.postData.contents) || "{}"
    );

    const group = validateGroupPayload_(payload);

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const groupsSheet = getOrCreateGroupsSheet_(spreadsheet);

    const existingGroups = groupsSheet.getLastRow() > 1
      ? groupsSheet
        .getRange(
          2,
          1,
          groupsSheet.getLastRow() - 1,
          GROUPS_HEADERS.length
        )
        .getValues()
      : [];

    const existingRow = existingGroups.find(
      row => String(row[0]) === group.id
    );

    // Mismo ID + mismos datos:
    // se considera una repetición válida del POST.
    if (existingRow) {
      const existingGroup = {
        id: String(existingRow[0]),
        nombre: String(existingRow[1]),
        miembros: parseMembers_(existingRow[2])
      };

      if (
        existingGroup.nombre !== group.nombre ||
        JSON.stringify(existingGroup.miembros) !==
          JSON.stringify(group.miembros)
      ) {
        throw new Error(
          "Ya existe un grupo distinto con el mismo ID."
        );
      }

      return groupsJsonResponse_({
        success: true,
        group: existingGroup
      });
    }

    // Mientras siga vigente el sistema actual,
    // cada grupo necesita su propia hoja de registros.
    if (spreadsheet.getSheetByName(group.nombre)) {
      throw new Error(
        "Ya existe una hoja con ese nombre."
      );
    }

    createGroupRecordsSheet_(
      spreadsheet,
      group.nombre
    );

    groupsSheet.appendRow([
      group.id,
      group.nombre,
      JSON.stringify(group.miembros),
      new Date().toISOString()
    ]);

    return groupsJsonResponse_({
      success: true,
      group
    });

  } catch (error) {
    return groupsJsonResponse_({
      success: false,
      error: error.message
    });

  } finally {
    lock.releaseLock();
  }
}


function getOrCreateGroupsSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(
    GROUPS_SHEET_NAME
  );

  if (!sheet) {
    sheet = spreadsheet.insertSheet(
      GROUPS_SHEET_NAME
    );
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(GROUPS_HEADERS);

    LEGACY_GROUPS.forEach(group => {
      sheet.appendRow([
        group.id,
        group.nombre,
        JSON.stringify(group.miembros),
        new Date().toISOString()
      ]);
    });
  }

  return sheet;
}


function createGroupRecordsSheet_(spreadsheet, sheetName) {
  const template = spreadsheet.getSheetByName(
    GROUP_RECORD_TEMPLATE_SHEET
  );

  if (!template || template.getLastColumn() === 0) {
    throw new Error(
      "No se encontró la cabecera de la hoja Perenquenes."
    );
  }

  const sheet = spreadsheet.insertSheet(
    sheetName
  );

  const columns = template.getLastColumn();

  // Copia únicamente la primera fila.
  // No copia ningún registro histórico.
  template
    .getRange(1, 1, 1, columns)
    .copyTo(
      sheet.getRange(1, 1, 1, columns)
    );

  sheet.setFrozenRows(
    template.getFrozenRows()
  );

  for (
    let column = 1;
    column <= columns;
    column++
  ) {
    sheet.setColumnWidth(
      column,
      template.getColumnWidth(column)
    );
  }
}


function validateGroupPayload_(payload) {
  const id =
    typeof payload.id === "string"
      ? payload.id.trim()
      : "";

  const nombre =
    typeof payload.nombre === "string"
      ? payload.nombre.trim()
      : "";

  const miembros =
    Array.isArray(payload.miembros)
      ? payload.miembros
        .map(member => String(member).trim())
        .filter(Boolean)
      : [];

  if (!/^grp_[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error(
      "ID de grupo no válido."
    );
  }

  if (
    !nombre ||
    nombre.length > 100 ||
    /[\\/?*\[\]:]/.test(nombre)
  ) {
    throw new Error(
      "Nombre de grupo no válido para una hoja."
    );
  }

  if (miembros.length < 2) {
    throw new Error(
      "El grupo debe tener al menos dos miembros."
    );
  }

  return {
    id,
    nombre,
    miembros
  };
}


function parseMembers_(value) {
  try {
    const members = JSON.parse(
      String(value || "[]")
    );

    return Array.isArray(members)
      ? members.map(String)
      : [];

  } catch (error) {
    return [];
  }
}


function groupsJsonResponse_(data) {
  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}
