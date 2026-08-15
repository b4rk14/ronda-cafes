function getSheet(group) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = group || "Perenquenes";
  return ss.getSheetByName(name);
}


function doGet(e) {
  // Routing para grupos.
  if (isGroupsRoute_(e)) {
    return getGroupsResponse_(e);
  }

  // Lógica existente de cafés.
  const group = e.parameter.group || "Perenquenes";
  const sheet = getSheet(group);

  const values = sheet.getDataRange().getValues();
  const tz = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSpreadsheetTimeZone();

  const rows = values.slice(1).map((r, i) => ({
    id: i + 2,
    name: r[0],
    date: Utilities.formatDate(
      new Date(r[1]),
      tz,
      "dd/MM/yyyy HH:mm:ss"
    )
  }));

  return ContentService
    .createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);
}


function doPost(e) {
  // Routing para grupos.
  if (isGroupsRoute_(e)) {
    return createGroupResponse_(e);
  }

  // Lógica existente de cafés.
  const data = JSON.parse(e.postData.contents);
  const group = data.group || "Perenquenes";

  const sheet = getSheet(group);

  if (data._method === "DELETE") {
    sheet.deleteRow(data.id);
  } else {
    sheet.appendRow([data.name, data.date]);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}


function doDelete(e) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SHEET_NAME);

  const data = JSON.parse(e.postData.contents);

  sheet.deleteRow(data.id);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
