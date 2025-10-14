use num_bigint::BigInt;
use sha2::{Digest, Sha256};

pub fn fiat_shamir(inputs: &[&BigInt]) -> BigInt {
    let mut hasher = Sha256::new();
    for i in inputs {
        hasher.update(i.to_str_radix(10).as_bytes());
    }
    let hash = hasher.finalize();
    BigInt::from_bytes_be(num_bigint::Sign::Plus, &hash)
}
