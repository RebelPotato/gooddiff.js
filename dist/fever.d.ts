interface AddOp<V> {
    add: (x: V, y: V) => V;
    zero: V;
    negate: (x: V) => V;
    sum: (xs: V[]) => V;
}
interface Num<V> extends AddOp<V> {
    fromNumber: (x: number) => V;
    sub: (x: V, y: V) => V;
    mul: (x: V, y: V) => V;
}
interface ScaleOp<W, V> {
    scale: (w: W, v: V) => V;
}
interface DotOp<W, V> {
    dot: (x: V, y: V) => W;
}
interface DecompOp<B, W, V> {
    decompose: (v: V, b: B) => W;
}
interface VectorSpace<W, V> extends ScaleOp<W, V>, AddOp<V> {
}
interface InnerSpace<W, V> extends DotOp<W, V>, VectorSpace<W, V> {
}
interface BasedSpace<B, W, V> extends DecompOp<B, W, V>, VectorSpace<W, V> {
}
declare function LiftAddOp<V, A>(op: AddOp<V>): AddOp<(_: A) => V>;
declare const LiftScaleOp: <W, V, A>(op: ScaleOp<W, V>) => ScaleOp<W, (_: A) => V>;
declare const LiftDecompOp: <B, W, V, A>(op: DecompOp<B, W, V>) => DecompOp<[A, B], W, (_: A) => V>;
type Diff<A, B> = {
    value: B;
    diff: DiffT<A, B>;
};
type DiffT<A, B> = (_: A) => Diff<A, B>;
declare function Diff<A, B>(value: B, diff: DiffT<A, B>): Diff<A, B>;
declare function dConst<X, W, V>(op: VectorSpace<W, V>, b: V): Diff<X, V>;
declare function dZero<A, W, V>(op: VectorSpace<W, V>): Diff<A, V>;
declare function linearD<A, W, V>(op: VectorSpace<W, V>, f: (_: A) => V): DiffT<A, V>;
declare const dId: <W, V>(op: VectorSpace<W, V>) => DiffT<V, V>;
declare const atD: <W, V>(op: VectorSpace<W, V>, i: number) => DiffT<V[], V>;
declare const dmap: <A, B, C>(f: (_: B) => C) => (x: Diff<A, B>) => Diff<A, C>;
declare const dmap2l: <A, B, C, D>(f2: (x: B, y: C) => D) => (x: Diff<A, B>, y: Diff<A, C>) => Diff<A, D>;
declare const dmap2d: <A, B, C, D>(f2: (x: B, y: C) => D, add: (x: Diff<A, D>, y: Diff<A, D>) => Diff<A, D>) => (x: Diff<A, B>, y: Diff<A, C>) => Diff<A, D>;
declare function DNumOp<A, V>(opN: Num<V>, opV: VectorSpace<V, V>): Num<Diff<A, V>>;
declare function DVectorSpaceOp<A, W, V>(op: VectorSpace<W, V>): VectorSpace<Diff<A, W>, Diff<A, V>>;
declare function chain1<A, W, V>(op: VectorSpace<W, V>, f: (_: V) => V, df: (_: Diff<A, V>) => Diff<A, W>): (x: Diff<A, V>) => Diff<A, V>;
declare function chain<A, B, C>(f: DiffT<B, C>, g: DiffT<A, B>): DiffT<A, C>;
type Real = {
    value: number;
    add: (other: Real) => Real;
    negate: () => Real;
    scale: (x: Real) => Real;
};
declare const RealOp: VectorSpace<Real, Real> & Num<Real>;
declare function Real(value: number): Real;
