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
  // Current time in seconds.
  return (new Date().getTime() / 1000).toFixed();
}

function compareWithEmoji(A, B) {
  return (String(A) == String(B) ? "✅" : "❌");
}

module.exports = {
  getDepositorsArray,
  compareWithEmoji,
  getCurrentTimestamp
};