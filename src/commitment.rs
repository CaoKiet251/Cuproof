use num_bigint::BigInt;
use num_traits::Zero;

/// Modular exponentiation: base^exp mod modulus
pub fn mod_exp(base: &BigInt, exp: &BigInt, modulus: &BigInt) -> BigInt {
    let base_pos = if base < &BigInt::zero() { -base } else { base.clone() };
    let exp_pos = if exp < &BigInt::zero() { -exp } else { exp.clone() };
    base_pos.modpow(&exp_pos, modulus)
}

/// Pedersen Commitment over RSA group
/// 
/// This function implements the Pedersen hash function:
/// H(m, r) = g^m * h^r mod n
/// 
/// Where:
/// - g, h are generators of the RSA group Z_n^*
/// - n = p * q is the RSA modulus (2048 bits)
/// - p, q are 1024-bit primes
/// - m is the message/value to commit
/// - r is the random blinding factor
/// 
/// Security properties:
/// - Hiding: commitment reveals no information about m
/// - Binding: computationally infeasible to find (m', r') ≠ (m, r) with H(m', r') = H(m, r)
/// - Homomorphic: H(m1 + m2, r1 + r2) = H(m1, r1) * H(m2, r2)
pub fn pedersen_commit(g: &BigInt, h: &BigInt, m: &BigInt, r: &BigInt, n: &BigInt) -> BigInt {
    mod_exp(g, m, n) * mod_exp(h, r, n) % n
}
