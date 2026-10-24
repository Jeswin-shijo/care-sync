// Appointment tokens. In the offline demo every booking has a token number. Signed
// in, it is the day's queue token, which the server issues at check-in; until then
// tokenNo is 0 and screens leave the token out rather than show a number the
// waiting-room display will not use.

/** "#12", or null before the patient has a token. */
export const tokenText = (tokenNo: number) => (tokenNo > 0 ? `#${tokenNo}` : null);

/** " • Token 12" to append to a line of details, or '' before the patient has a token. */
export const tokenSuffix = (tokenNo: number) => (tokenNo > 0 ? ` • Token ${tokenNo}` : '');
