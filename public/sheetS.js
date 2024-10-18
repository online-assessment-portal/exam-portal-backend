const pgInfo = JSON.parse(document.getElementById("pgInfo").innerText);
var wb = XLSX.utils.table_to_book(document.getElementById("mytable"), {
	sheet: "Response Sheet",
});
wb.Props = {
	Title: "Response Collection",
	Subject: "Response Sheet",
	Author: "Shred Test",
	CreatedDate: new Date(),
};
var wbout = XLSX.write(wb, { bookType: "xlsx", bookSST: true, type: "binary" });
function s2ab(s) {
	var buf = new ArrayBuffer(s.length);
	var view = new Uint8Array(buf);
	for (var i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
	return buf;
}
saveAs(
	new Blob([s2ab(wbout)], { type: "application/octet-stream" }),
	pgInfo.filename
);
