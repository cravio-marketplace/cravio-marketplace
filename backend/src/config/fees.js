/**
 * Cravio fee and settlement configuration.
 * All monetary values are stored in kobo. Edit fee policy here.
 */
const FEES = Object.freeze({
    customerServiceFee: Object.freeze({
        rateBps: 500,
        minKobo: 5000,
        maxKobo: 20000,
        firstOrderFree: true,
    }),
    vendorCommission: Object.freeze({
        rateBps: 500,
        freeDays: 60,
    }),
    cashSettlement: Object.freeze({
        outstandingCapKobo: 500000,
        dueDays: 7,
        paymentMethod: 'cash',
    }),
});

function calculateServiceFee(subtotalKobo, isFirstOrder = false) {
    if (!Number.isSafeInteger(subtotalKobo) || subtotalKobo < 0) {
        throw new TypeError('subtotalKobo must be a non-negative integer.');
    }
    if (FEES.customerServiceFee.firstOrderFree && isFirstOrder) return 0;
    const feeNaira = Math.round(
        (subtotalKobo * FEES.customerServiceFee.rateBps) / 10000 / 100
    );
    return Math.min(
        FEES.customerServiceFee.maxKobo,
        Math.max(FEES.customerServiceFee.minKobo, feeNaira * 100)
    );
}

module.exports = { FEES, calculateServiceFee };
