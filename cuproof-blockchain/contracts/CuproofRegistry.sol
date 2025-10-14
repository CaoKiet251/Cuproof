// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CuproofRegistry
 * @dev Smart contract for managing Cuproof public parameters
 * @notice This contract manages different sets of public parameters (g, h, n) for the Cuproof system
 */
contract CuproofRegistry {
    // Events
    event ParamsUpdated(
        uint256 indexed paramSetId, 
        bytes32 paramsHash,
        uint256 timestamp
    );
    
    event ParamsActivated(uint256 indexed paramSetId);
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    
    // Struct to store public parameters
    struct PublicParams {
        bytes32 g;           // Generator g
        bytes32 h;           // Generator h  
        bytes32 n;           // Modulus n
        uint256 timestamp;   // When parameters were created
        bool active;         // Whether this parameter set is active
        string description;  // Description of the parameter set
    }
    
    // State variables
    mapping(uint256 => PublicParams) public paramSets;
    uint256 public currentParamSet;
    uint256 public paramSetCounter;
    address public owner;
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier validAddress(address addr) {
        require(addr != address(0), "Invalid address");
        _;
    }
    
    modifier validParamSet(uint256 paramSetId) {
        require(paramSetId > 0 && paramSetId <= paramSetCounter, "Invalid parameter set");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        paramSetCounter = 0;
        currentParamSet = 0;
    }
    
    /**
     * @dev Update public parameters for Cuproof system
     * @param g Generator g
     * @param h Generator h
     * @param n Modulus n
     * @param description Description of this parameter set
     */
    function updatePublicParams(
        bytes32 g,
        bytes32 h,
        bytes32 n,
        string calldata description
    ) external onlyOwner {
        require(g != bytes32(0), "Invalid generator g");
        require(h != bytes32(0), "Invalid generator h");
        require(n != bytes32(0), "Invalid modulus n");
        require(bytes(description).length > 0, "Description cannot be empty");
        
        paramSetCounter++;
        
        paramSets[paramSetCounter] = PublicParams({
            g: g,
            h: h,
            n: n,
            timestamp: block.timestamp,
            active: true,
            description: description
        });
        
        // Deactivate previous parameter set
        if (currentParamSet > 0) {
            paramSets[currentParamSet].active = false;
        }
        
        currentParamSet = paramSetCounter;
        
        bytes32 paramsHash = keccak256(abi.encodePacked(g, h, n));
        emit ParamsUpdated(paramSetCounter, paramsHash, block.timestamp);
    }
    
    /**
     * @dev Activate a specific parameter set
     * @param paramSetId ID of the parameter set to activate
     */
    function activateParamSet(uint256 paramSetId) external onlyOwner validParamSet(paramSetId) {
        // Deactivate current parameter set
        if (currentParamSet > 0) {
            paramSets[currentParamSet].active = false;
        }
        
        // Activate new parameter set
        paramSets[paramSetId].active = true;
        currentParamSet = paramSetId;
        
        emit ParamsActivated(paramSetId);
    }
    
    /**
     * @dev Get current active public parameters
     * @return g Generator g
     * @return h Generator h
     * @return n Modulus n
     */
    function getCurrentParams() external view returns (bytes32 g, bytes32 h, bytes32 n) {
        require(currentParamSet > 0, "No active parameter set");
        PublicParams memory params = paramSets[currentParamSet];
        return (params.g, params.h, params.n);
    }
    
    /**
     * @dev Get public parameters by ID
     * @param paramSetId ID of the parameter set
     * @return g Generator g
     * @return h Generator h
     * @return n Modulus n
     * @return timestamp When parameters were created
     * @return active Whether this parameter set is active
     * @return description Description of the parameter set
     */
    function getParamsById(uint256 paramSetId) external view validParamSet(paramSetId) returns (
        bytes32 g,
        bytes32 h,
        bytes32 n,
        uint256 timestamp,
        bool active,
        string memory description
    ) {
        PublicParams memory params = paramSets[paramSetId];
        return (params.g, params.h, params.n, params.timestamp, params.active, params.description);
    }
    
    /**
     * @dev Get hash of current public parameters
     * @return bytes32 Hash of current parameters
     */
    function getCurrentParamsHash() external view returns (bytes32) {
        require(currentParamSet > 0, "No active parameter set");
        PublicParams memory params = paramSets[currentParamSet];
        return keccak256(abi.encodePacked(params.g, params.h, params.n));
    }
    
    /**
     * @dev Get hash of parameters by ID
     * @param paramSetId ID of the parameter set
     * @return bytes32 Hash of the parameters
     */
    function getParamsHashById(uint256 paramSetId) external view validParamSet(paramSetId) returns (bytes32) {
        PublicParams memory params = paramSets[paramSetId];
        return keccak256(abi.encodePacked(params.g, params.h, params.n));
    }
    
    /**
     * @dev Get total number of parameter sets
     * @return uint256 Total number of parameter sets
     */
    function getParamSetsCount() external view returns (uint256) {
        return paramSetCounter;
    }
    
    /**
     * @dev Get current active parameter set ID
     * @return uint256 Current active parameter set ID
     */
    function getCurrentParamSetId() external view returns (uint256) {
        return currentParamSet;
    }
    
    /**
     * @dev Check if a parameter set is active
     * @param paramSetId ID of the parameter set to check
     * @return bool True if the parameter set is active
     */
    function isParamSetActive(uint256 paramSetId) external view validParamSet(paramSetId) returns (bool) {
        return paramSets[paramSetId].active;
    }
    
    /**
     * @dev Get all parameter set IDs
     * @return uint256[] Array of all parameter set IDs
     */
    function getAllParamSetIds() external view returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](paramSetCounter);
        for (uint256 i = 1; i <= paramSetCounter; i++) {
            ids[i - 1] = i;
        }
        return ids;
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
     * @dev Emergency function to pause contract (if needed)
     * @notice This function can be called by owner in case of emergency
     */
    function emergencyPause() external onlyOwner {
        // Implementation for emergency pause if needed
        // This is a placeholder for future implementation
    }
    
    /**
     * @dev Get parameter set info by ID
     * @param paramSetId ID of the parameter set
     * @return PublicParams Complete parameter set information
     */
    function getParamSetInfo(uint256 paramSetId) external view validParamSet(paramSetId) returns (PublicParams memory) {
        return paramSets[paramSetId];
    }
}
