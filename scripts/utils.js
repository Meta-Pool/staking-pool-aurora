async function getDepositorsArray(contract) {
  var depositors = new Array();
  const depositorsLength = await contract.getDepositorsLength();
  console.log("CUANTOS %s", depositorsLength);
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

module.exports = {
  getDepositorsArray,
  getCurrentTimestamp
};