"use strict";
// functions as vector space with basis
function LiftAddOp(op) {
    return {
        add: (f, g) => (x) => op.add(f(x), g(x)),
        zero: (_) => op.zero,
        negate: (f) => (x) => op.negate(f(x)),
        sum: (fs) => (x) => op.sum(fs.map((f) => f(x))),
    };
}
const LiftScaleOp = (op) => ({
    scale: (x, f) => (y) => op.scale(x, f(y)),
});
const LiftDecompOp = (op) => ({
    decompose: (v, [a, b]) => op.decompose(v(a), b),
});
function Diff(value, diff) {
    return { value, diff };
}
function dConst(op, b) {
    return Diff(b, (_) => dZero(op));
}
function dZero(op) {
    return dConst(op, op.zero);
}
function linearD(op, f) {
    return (u) => Diff(f(u), (du) => dConst(op, f(du)));
}
const dId = (op) => linearD(op, (x) => x);
const atD = (op, i) => linearD(op, (x) => x[i]);
const dmap = (f) => {
    const self = (x) => Diff(f(x.value), (da) => self(x.diff(da)));
    return self;
};
const dmap2l = (f2) => {
    const self = (x, y) => Diff(f2(x.value, y.value), (da) => self(x.diff(da), y.diff(da)));
    return self;
};
// distributive map
const dmap2d = (f2, add) => {
    const self = (x, y) => Diff(f2(x.value, y.value), (da) => add(self(x.diff(da), y), self(x, y.diff(da))));
    return self;
};
function DNumOp(opN, opV) {
    const obj = {
        fromNumber: (x) => dConst(opV, opN.fromNumber(x)),
        add: dmap2l(opN.add),
        sub: dmap2l(opN.sub),
        mul: dmap2d(opN.mul, (x, y) => obj.add(x, y)),
        zero: dZero(opV),
        negate: dmap(opN.negate),
        sum: (xs) => Diff(opN.sum(xs.map((x) => x.value)), (da) => obj.sum(xs.map((x) => x.diff(da)))),
    };
    return obj;
}
function DVectorSpaceOp(op) {
    const obj = {
        add: dmap2l(op.add),
        zero: dZero(op),
        negate: dmap(op.negate),
        sum: (xs) => Diff(op.sum(xs.map((x) => x.value)), (da) => obj.sum(xs.map((x) => x.diff(da)))),
        scale: dmap2d(op.scale, (x, y) => obj.add(x, y)),
    };
    return obj;
}
function chain1(op, f, df) {
    const opF = DVectorSpaceOp(op);
    return (x) => Diff(f(x.value), (da) => opF.scale(df(x), x.diff(da)));
}
function chain(f, g) {
    return (a0) => {
        const dg = g(a0);
        const df = f(dg.value);
        return Diff(df.value, chain(df.diff, dg.diff));
    };
}
const RealOp = {
    add: (x, y) => Real(x.value + y.value),
    sub: (x, y) => Real(x.value - y.value),
    mul: (x, y) => Real(x.value * y.value),
    fromNumber: (x) => Real(x),
    zero: Real(0),
    negate: (x) => Real(-x.value),
    sum: (xs) => Real(xs.reduce((acc, x) => acc + x.value, 0)),
    scale: (x, y) => Real(x.value * y.value),
};
function Real(value) {
    const obj = {
        value,
        add: (other) => Real(value + other.value),
        negate: () => Real(-value),
        scale: (x) => Real(value * x.value),
    };
    return obj;
}
