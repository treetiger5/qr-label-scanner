// 한글 주석: DOM 요소 캐싱
const elements = {
  userName: document.getElementById("userName"),
  inboundButton: document.getElementById("inboundButton"),
  outboundButton: document.getElementById("outboundButton"),
  quantityInput: document.getElementById("quantityInput"),
  stockBalanceContainer: document.getElementById("stockBalanceContainer"),
  stockBalance: document.getElementById("stockBalance"),
  scanButton: document.getElementById("scanButton"),
  cancelScan: document.getElementById("cancelScan"),
  saveButton: document.getElementById("saveData"),
  downloadButton: document.getElementById("downloadCSV"),
  result: document.getElementById("result"),
  video: document.getElementById("video")
};

// 한글 주석: 재고 데이터 저장 객체
const stockData = {};

// 한글 주석: 현재 선택된 거래 유형 (Inbound 기본값)
let transactionType = "Inbound";

// 한글 주석: 현재 스캔된 QR 코드 데이터
let tempScan = null;

// 한글 주석: 스캔 데이터 저장 배열
const scannedData = [];

// 한글 주석: 거래 유형 버튼 선택 핸들러
function selectTransaction(type) {
  transactionType = type;
  elements.inboundButton.classList.toggle("active-inbound", type === "Inbound");
  elements.outboundButton.classList.toggle("active-outbound", type === "Outbound");
}

// 한글 주석: Save 버튼 상태 업데이트
function updateSaveButton() {
  const userName = elements.userName.value.trim();
  const quantity = elements.quantityInput.value.trim();

  if (userName && quantity && tempScan) {
      elements.saveButton.style.display = "inline-block";
  } else {
      elements.saveButton.style.display = "none";
  }
}

// 한글 주석: QR 코드 스캔 기능
function startScanning() {
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
          elements.video.srcObject = stream;
          elements.video.play();
          elements.video.style.display = "block";
          elements.cancelScan.style.display = "inline-block"; // 한글 주석: 취소 버튼 표시

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          function scanFrame() {
              if (elements.video.readyState === elements.video.HAVE_ENOUGH_DATA) {
                  canvas.width = elements.video.videoWidth;
                  canvas.height = elements.video.videoHeight;
                  ctx.drawImage(elements.video, 0, 0, canvas.width, canvas.height);

                  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  const code = jsQR(imageData.data, imageData.width, imageData.height);

                  if (code) {
                      tempScan = code.data;
                      elements.result.innerText = `Scanned: ${code.data}`;
                      elements.video.srcObject.getTracks().forEach(track => track.stop());
                      elements.video.style.display = "none";
                      elements.cancelScan.style.display = "none"; // 한글 주석: 스캔 후 취소 버튼 숨김

                      elements.stockBalanceContainer.style.display = "block";
                      elements.stockBalance.value = stockData[tempScan] || 0;

                      updateSaveButton();
                  } else {
                      requestAnimationFrame(scanFrame);
                  }
              } else {
                  setTimeout(scanFrame, 500);
              }
          }
          scanFrame();
      })
      .catch(err => {
          elements.result.innerText = "Camera access denied. Please allow camera access.";
          console.error(err);
      });
}

// 한글 주석: 카메라 취소 버튼 핸들러
function cancelScanning() {
  if (elements.video.srcObject) {
      elements.video.srcObject.getTracks().forEach(track => track.stop());
  }
  elements.video.style.display = "none";
  elements.cancelScan.style.display = "none"; // 한글 주석: 취소 버튼 숨김
}

// 한글 주석: Save 버튼 클릭 시 실행되는 함수
function saveData() {
  const userName = elements.userName.value.trim();
  const quantityInput = elements.quantityInput.value.trim();

  if (!tempScan) {
      alert("No QR code scanned.");
      return;
  }

  if (quantityInput === "" || isNaN(quantityInput) || Number(quantityInput) <= 0) {
      alert("Please enter a valid quantity (1 or more).");
      return;
  }

  const quantity = Number(quantityInput);
  let currentStock = stockData[tempScan] || 0;

  if (transactionType === "Inbound") {
      currentStock += quantity;
  } else if (transactionType === "Outbound") {
      if (quantity > currentStock) {
          alert("Not enough stock available!");
          return;
      }
      currentStock -= quantity;
  }

  stockData[tempScan] = currentStock;
  elements.stockBalance.value = currentStock;

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toLocaleTimeString("en-GB", { hour12: false });

  scannedData.push({
      user: userName,
      date: dateStr,
      time: timeStr,
      data: tempScan,
      quantity: quantity,
      transaction: transactionType,
      stock: currentStock
  });

  elements.result.innerText = `Saved! (User: ${userName}, QR: ${tempScan}, Qty: ${quantity}, Transaction: ${transactionType}, Stock: ${currentStock})`;

  // 한글 주석: 입력 필드 및 재고 초기화
  tempScan = null;
  elements.userName.value = "";
  elements.quantityInput.value = "";
  elements.stockBalance.value = "";
  elements.stockBalanceContainer.style.display = "none"; // 한글 주석: Save 후 Stock Balance 다시 숨김
  elements.result.innerText = "Scanned information will appear here.";
  updateSaveButton();
}

// 한글 주석: CSV 다운로드 기능
function downloadCSV() {
  if (scannedData.length === 0) {
      alert("No data to download.");
      return;
  }

  let csvHeader = "\uFEFFUser,Date,Time,Scanned Data,Quantity,Transaction,Stock Balance\n";
  let csvRows = scannedData.map(item =>
      `${item.user},"${item.date}","${item.time}","${item.data}",${item.quantity},${item.transaction},${item.stock}`
  );
  let csvContent = "data:text/csv;charset=utf-8," + csvHeader + csvRows.join("\n");

  let encodedUri = encodeURI(csvContent);
  let timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  let link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `stock_data_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 한글 주석: 이벤트 리스너 등록
elements.inboundButton.addEventListener("click", () => selectTransaction("Inbound"));
elements.outboundButton.addEventListener("click", () => selectTransaction("Outbound"));
elements.scanButton.addEventListener("click", startScanning);
elements.cancelScan.addEventListener("click", cancelScanning);
elements.userName.addEventListener("input", updateSaveButton);
elements.quantityInput.addEventListener("input", updateSaveButton);
elements.saveButton.addEventListener("click", saveData);
elements.downloadButton.addEventListener("click", downloadCSV);
