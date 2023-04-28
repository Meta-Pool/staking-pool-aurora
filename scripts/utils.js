async function getDepositorsArray(contract) {
  var depositors = [];
  const depositorsLength = await contract.getDepositorsLength();
  for (let i = 0; i < depositorsLength; i++) {
    depositors.push(
      await contract.depositors(i)
    );
  }
  return depositors;
}

function getCurrentTimestamp() {
  return Date.now();
}

function compareWithEmoji(A, B) {
  return (String(A) == String(B) ? "✅" : "❌");
}

module.exports = {
  getDepositorsArray,
  compareWithEmoji,
  getCurrentTimestamp
};