module.exports = function(leftVal, operator, curRightVal, round, both) {
    leftVal = parseFloat(leftVal);
    curRightVal = parseFloat(curRightVal) * 100;

    if (both == 'true') {
        leftVal = leftVal * 100;
    }

    var cents = {
        "+": curRightVal + leftVal,
        "-": curRightVal - leftVal,
        "*": curRightVal * leftVal,
        "/": curRightVal / leftVal,
        "%": curRightVal % leftVal
    }[operator];

    if (round == 'true') {
        cents = Math.round(cents);
    }

    if (cents == 0) {
        return cents.toFixed(2);
    } else {
        cents = cents.toString();
        return cents.substring(0,cents.length-2)+"."+cents.substring(cents.length-2)
    }
};