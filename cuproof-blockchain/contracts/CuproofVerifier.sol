// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title CuproofVerifier
 * @dev Smart contract for managing Cuproof range proof verifications
 * @notice This contract stores verification results and manages authorized verifiers
 */
contract CuproofVerifier {
    // Events
    event ProofSubmitted(
        address indexed subject,
        bytes32 indexed proofHash,
        bytes32 commitment,
        uint256 rangeMin,
        uint256 rangeMax,
        uint256 timestamp,
        address verifier
    );
    
    event ProofVerified(
        bytes32 indexed proofHash,
        bool isValid,
        address verifier
    );
    
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    
    // State variables
    mapping(bytes32 => bool) public verifiedProofs;
    mapping(address => bytes32) public latestProofHash;
    mapping(address => bool) public authorizedVerifiers;
    mapping(bytes32 => ProofInfo) public proofInfo;
    
    address public owner;
    bytes32 public publicParamsHash; // Hash of (g,h,n)
    
    struct ProofInfo {
        address subject;
        bytes32 commitment;
        uint256 rangeMin;
        uint256 rangeMax;
        uint256 timestamp;
        address verifier;
        bool isValid;
    }
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyAuthorizedVerifier() {
        require(authorizedVerifiers[msg.sender], "Unauthorized verifier");
        _;
    }
    
    modifier validAddress(address addr) {
        require(addr != address(0), "Invalid address");
        _;
    }
    
    constructor(bytes32 _publicParamsHash) {
        owner = msg.sender;
        publicParamsHash = _publicParamsHash;
    }
    
    /**
     * @dev Add an authorized verifier
     * @param verifier Address of the verifier to authorize
     */
    function addVerifier(address verifier) external onlyOwner validAddress(verifier) {
        require(!authorizedVerifiers[verifier], "Verifier already authorized");
        authorizedVerifiers[verifier] = true;
        emit VerifierAdded(verifier);
    }
    
    /**
     * @dev Remove an authorized verifier
     * @param verifier Address of the verifier to remove
     */
    function removeVerifier(address verifier) external onlyOwner validAddress(verifier) {
        require(authorizedVerifiers[verifier], "Verifier not authorized");
        authorizedVerifiers[verifier] = false;
        emit VerifierRemoved(verifier);
    }
    
    /**
     * @dev Submit a proof receipt after off-chain verification
     * @param subject Address of the subject (prover)
     * @param proofHash Hash of the proof
     * @param commitment Commitment to the value
     * @param rangeMin Minimum value of the range
     * @param rangeMax Maximum value of the range
     * @param nonce Nonce to prevent replay attacks
     * @param deadline Deadline for the proof
     * @param signature Signature from the verifier
     */
    function submitProofReceipt(
        address subject,
        bytes32 proofHash,
        bytes32 commitment,
        uint256 rangeMin,
        uint256 rangeMax,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, "Proof expired");
        require(!verifiedProofs[proofHash], "Proof already verified");
        require(subject != address(0), "Invalid subject address");
        require(rangeMin <= rangeMax, "Invalid range");
        
        // Verify signature from authorized verifier
        bytes32 messageHash = keccak256(abi.encodePacked(
            proofHash,
            commitment,
            rangeMin,
            rangeMax,
            nonce,
            deadline,
            subject
        ));
        
        address signer = ECDSA.recover(ECDSA.toEthSignedMessageHash(messageHash), signature);
        require(authorizedVerifiers[signer], "Invalid verifier signature");
        
        // Store proof verification
        verifiedProofs[proofHash] = true;
        latestProofHash[subject] = proofHash;
        
        // Store detailed proof info
        proofInfo[proofHash] = ProofInfo({
            subject: subject,
            commitment: commitment,
            rangeMin: rangeMin,
            rangeMax: rangeMax,
            timestamp: block.timestamp,
            verifier: signer,
            isValid: true
        });
        
        emit ProofSubmitted(
            subject,
            proofHash,
            commitment,
            rangeMin,
            rangeMax,
            block.timestamp,
            signer
        );
    }
    
    /**
     * @dev Check if a proof has been verified
     * @param proofHash Hash of the proof to check
     * @return bool True if the proof has been verified
     */
    function verifyProofStatus(bytes32 proofHash) external view returns (bool) {
        return verifiedProofs[proofHash];
    }
    
    /**
     * @dev Get the latest proof hash for a subject
     * @param subject Address of the subject
     * @return bytes32 Latest proof hash for the subject
     */
    function getSubjectLatestProof(address subject) external view returns (bytes32) {
        return latestProofHash[subject];
    }
    
    /**
     * @dev Get detailed information about a proof
     * @param proofHash Hash of the proof
     * @return ProofInfo Detailed information about the proof
     */
    function getProofInfo(bytes32 proofHash) external view returns (ProofInfo memory) {
        require(verifiedProofs[proofHash], "Proof not found");
        return proofInfo[proofHash];
    }
    
    /**
     * @dev Check if an address is an authorized verifier
     * @param verifier Address to check
     * @return bool True if the address is an authorized verifier
     */
    function isAuthorizedVerifier(address verifier) external view returns (bool) {
        return authorizedVerifiers[verifier];
    }
    
    /**
     * @dev Get the count of verified proofs
     * @return uint256 Number of verified proofs
     */
    function getVerifiedProofsCount() external view returns (uint256) {
        // This is a simplified implementation
        // In practice, you might want to maintain a counter
        return 0; // Placeholder
    }
    
    /**
     * @dev Transfer ownership of the contract
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner validAddress(newOwner) {
        address oldOwner = owner;
        owner = newOwner;
        emit OwnerChanged(oldOwner, newOwner);
    }
    
    /**
     * @dev Update public parameters hash
     * @param newParamsHash New hash of public parameters
     */
    function updatePublicParamsHash(bytes32 newParamsHash) external onlyOwner {
        publicParamsHash = newParamsHash;
    }
    
    /**
     * @dev Recover signer from message hash and signature
     * @param messageHash Hash of the message
     * @param signature Signature to recover from
     * @return address Address of the signer
     */
    function recoverSigner(bytes32 messageHash, bytes calldata signature) 
        internal pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 0x20))
            v := byte(0, calldataload(add(signature.offset, 0x40)))
        }
        
        return ecrecover(messageHash, v, r, s);
    }
    
    /**
     * @dev Emergency function to pause contract (if needed)
     * @notice This function can be called by owner in case of emergency
     */
    function emergencyPause() external onlyOwner {
        // Implementation for emergency pause if needed
        // This is a placeholder for future implementation
    }
}
