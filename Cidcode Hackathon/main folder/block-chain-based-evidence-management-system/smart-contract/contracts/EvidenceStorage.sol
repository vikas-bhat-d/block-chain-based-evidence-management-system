//pragma solidity ^0.8.28;

// contract EvidenceStorage {
//     enum Role { NONE, ADMIN, INVESTIGATOR, ANALYST }

//     struct Case {
//         string caseId;
//         //string name
//         string description;
//         uint256 createdAt;
//         address owner;
//     }

//     struct Evidence {
//         string id;
//         string name;
//         string ipfsHash;
//         string sha256Hash;
//         string mimeType;
//         address uploader;
//         uint256 timestamp;
//         bool isFolder;
//         string parentId;
//     }

//     mapping(string => Case) public cases;
//     mapping(string => Evidence) public evidenceRecords;
//     mapping(string => string[]) public folderContents;
//     mapping(string => string[]) public caseEvidence; 
//     mapping(address => mapping(string => Role)) public userRoles;

//     event EvidenceStored(string indexed caseId, string indexed parentId, string id, string name, bool isFolder);
//     event CaseCreated(string indexed caseId, string description, address owner);
//     event RoleAssigned(string indexed caseId, address indexed user, Role role);

//     modifier onlyAdmin(string memory caseId) {
//         require(userRoles[msg.sender][caseId] == Role.ADMIN, "Not authorized");
//         _;
//     }

//     modifier onlyInvestigatorOrAdmin(string memory caseId) {
//         require(
//             userRoles[msg.sender][caseId] == Role.ADMIN || userRoles[msg.sender][caseId] == Role.INVESTIGATOR,
//             "Not authorized"
//         );
//         _;
//     }

//     function createCase(string memory caseId, string memory description) public {
//         require(bytes(cases[caseId].caseId).length == 0, "Case already exists");

//         cases[caseId] = Case({
//             caseId: caseId,
//             description: description,
//             createdAt: block.timestamp,
//             owner: msg.sender
//         });

//         userRoles[msg.sender][caseId] = Role.ADMIN;
//         emit CaseCreated(caseId, description, msg.sender);
//     }

//     function assignRole(string memory caseId, address user, Role role) public onlyAdmin(caseId) {
//         userRoles[user][caseId] = role;
//         emit RoleAssigned(caseId, user, role);
//     }

//     function storeEvidence(
//         string memory caseId,
//         string memory parentId,
//         string memory id,
//         string memory name,
//         string memory ipfsHash,
//         string memory sha256Hash,
//         string memory mimeType,
//         bool isFolder
//     ) public onlyInvestigatorOrAdmin(caseId) {
//         require(bytes(id).length > 0, "Invalid ID");
//         require(bytes(name).length > 0, "Invalid name");
//         require(bytes(cases[caseId].caseId).length > 0, "Case does not exist");

//         if (!isFolder) {
//             require(bytes(ipfsHash).length > 0, "Invalid IPFS hash");
//             require(bytes(sha256Hash).length > 0, "Invalid SHA-256 hash");
//             require(bytes(mimeType).length > 0, "Invalid MIME type");
//         }

//         evidenceRecords[id] = Evidence({
//             id: id,
//             name: name,
//             ipfsHash: ipfsHash,
//             sha256Hash: sha256Hash,
//             mimeType: mimeType,
//             uploader: msg.sender,
//             timestamp: block.timestamp,
//             isFolder: isFolder,
//             parentId: parentId
//         });

//         if (bytes(parentId).length == 0) {
//             caseEvidence[caseId].push(id);
//         } else {
//             folderContents[parentId].push(id);
//         }

//         emit EvidenceStored(caseId, parentId, id, name, isFolder);
//     }

//     function getCaseRootContents(string memory caseId) public view returns (string[] memory) {
//         return caseEvidence[caseId]; 
//     }

//     function getFolderContents(string memory folderId) public view returns (string[] memory) {
//         return folderContents[folderId];
//     }

//     function getFullCaseTree(string memory caseId) public view returns (string[] memory) {
//         string[] memory rootFiles = caseEvidence[caseId]; 

//         uint256 totalLength = rootFiles.length;
//         for (uint256 i = 0; i < rootFiles.length; i++) {
//             if (evidenceRecords[rootFiles[i]].isFolder) {
//                 totalLength += _getTotalNestedFiles(rootFiles[i]);
//             }
//         }

//         string[] memory fullTree = new string[](totalLength);
//         uint256 index = 0;

//         for (uint256 i = 0; i < rootFiles.length; i++) {
//             fullTree[index] = rootFiles[i];
//             index++;

//             if (evidenceRecords[rootFiles[i]].isFolder) {
//                 string[] memory nestedFiles = _getNestedFileIDs(rootFiles[i]);
//                 for (uint256 j = 0; j < nestedFiles.length; j++) {
//                     fullTree[index] = nestedFiles[j];
//                     index++;
//                 }
//             }
//         }

//         return fullTree;
//     }

//     function _getNestedFileIDs(string memory parentId) internal view returns (string[] memory) {
//         uint256 totalLength = _getTotalNestedFiles(parentId);
//         string[] memory allFiles = new string[](totalLength);

//         uint256 index = 0;
//         for (uint256 i = 0; i < folderContents[parentId].length; i++) {
//             string memory childId = folderContents[parentId][i];
//             allFiles[index] = childId;
//             index++;

//             if (evidenceRecords[childId].isFolder) {
//                 string[] memory nestedFiles = _getNestedFileIDs(childId);
//                 for (uint256 j = 0; j < nestedFiles.length; j++) {
//                     allFiles[index] = nestedFiles[j];
//                     index++;
//                 }
//             }
//         }

//         return allFiles;
//     }

//     function _getTotalNestedFiles(string memory parentId) internal view returns (uint256 count) {
//         count = folderContents[parentId].length;
//         for (uint256 i = 0; i < folderContents[parentId].length; i++) {
//             string memory childId = folderContents[parentId][i];
//             if (evidenceRecords[childId].isFolder) {
//                 count += _getTotalNestedFiles(childId);
//             }
//         }
//     }
// }


// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract EvidenceStorage {
    enum Role { NONE, ADMIN, INVESTIGATOR, ANALYST }

    struct Case {
        string caseId;
        string description;
        uint256 createdAt;
        address owner;
    }

    struct Evidence {
        string id;
        string name;
        string ipfsHash;
        string sha256Hash;
        string mimeType;
        address uploader;
        uint256 timestamp;
        bool isFolder;
        string parentId;
    }

    struct EvidenceData {
        string caseId;
        string id;
        string name;
        string ipfsHash;
        string sha256Hash;
        string mimeType;
        address uploader;
        bool isFolder;
        string parentId;
    }

    mapping(string => Case) public cases;
    mapping(string => Evidence) public evidenceRecords;
    mapping(string => string[]) public folderContents;
    mapping(string => string[]) public caseEvidence; 
    mapping(address => mapping(string => Role)) public userRoles;

    event EvidenceStored(string indexed caseId, string indexed parentId, string id, string name, bool isFolder);
    event CaseCreated(string indexed caseId, string description, address owner);
    event RoleAssigned(string indexed caseId, address indexed user, Role role);
    event DebugLog(string message, string value);

    modifier onlyAdmin(string memory caseId) {
        require(userRoles[msg.sender][caseId] == Role.ADMIN, "Not authorized");
        _;
    }

    modifier onlyInvestigatorOrAdmin(string memory caseId) {
        require(
            userRoles[msg.sender][caseId] == Role.ADMIN || userRoles[msg.sender][caseId] == Role.INVESTIGATOR,
            "Not authorized"
        );
        _;
    }

    function createCase(string memory caseId, string memory description) public {
        require(bytes(cases[caseId].caseId).length == 0, "Case already exists");

        cases[caseId] = Case({
            caseId: caseId,
            description: description,
            createdAt: block.timestamp,
            owner: msg.sender
        });

        userRoles[msg.sender][caseId] = Role.ADMIN;
        emit CaseCreated(caseId, description, msg.sender);
    }

    function assignRole(string memory caseId, address user, Role role) public onlyAdmin(caseId) {
        userRoles[user][caseId] = role;
        emit RoleAssigned(caseId, user, role);
    }

    function storeEvidence(
        EvidenceData memory evidenceData,
        bytes memory signature
    ) public onlyInvestigatorOrAdmin(evidenceData.caseId) {
        emit DebugLog("storeEvidence called", evidenceData.caseId);

        require(bytes(evidenceData.id).length > 0, "Invalid ID");
        emit DebugLog("ID check passed", evidenceData.id);

        require(bytes(evidenceData.name).length > 0, "Invalid name");
        emit DebugLog("Name check passed", evidenceData.name);

        require(bytes(cases[evidenceData.caseId].caseId).length > 0, "Case does not exist");
        emit DebugLog("Case exists", evidenceData.caseId);

        if (!evidenceData.isFolder) {
            require(bytes(evidenceData.ipfsHash).length > 0, "Invalid IPFS hash");
            emit DebugLog("IPFS Hash check passed", evidenceData.ipfsHash);

            require(bytes(evidenceData.sha256Hash).length > 0, "Invalid SHA-256 hash");
            emit DebugLog("SHA-256 Hash check passed", evidenceData.sha256Hash);

            require(bytes(evidenceData.mimeType).length > 0, "Invalid MIME type");
            emit DebugLog("MIME type check passed", evidenceData.mimeType);
        }

        // Verify uploader's signature
        bytes32 dataHash = getDataHash(evidenceData);
        address recoveredSigner = recoverSigner(dataHash, signature);
        require(recoveredSigner == evidenceData.uploader, "Invalid signature");

        emit DebugLog("Signature verified", "");

        // Store file metadata
        evidenceRecords[evidenceData.id] = Evidence({
            id: evidenceData.id,
            name: evidenceData.name,
            ipfsHash: evidenceData.ipfsHash,
            sha256Hash: evidenceData.sha256Hash,
            mimeType: evidenceData.mimeType,
            uploader: recoveredSigner,
            timestamp: block.timestamp,
            isFolder: evidenceData.isFolder,
            parentId: evidenceData.parentId
        });

        emit DebugLog("Evidence stored", evidenceData.id);

        // Update hierarchy
        if (bytes(evidenceData.parentId).length == 0) {
            caseEvidence[evidenceData.caseId].push(evidenceData.id);
        } else {
            folderContents[evidenceData.parentId].push(evidenceData.id);
        }

        emit EvidenceStored(evidenceData.caseId, evidenceData.parentId, evidenceData.id, evidenceData.name, evidenceData.isFolder);
    }

    function getDataHash(EvidenceData memory evidenceData) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            evidenceData.caseId, 
            evidenceData.id, 
            evidenceData.name, 
            evidenceData.ipfsHash, 
            evidenceData.sha256Hash, 
            evidenceData.mimeType, 
            evidenceData.uploader, 
            evidenceData.isFolder, 
            evidenceData.parentId
        ));
    }

    function recoverSigner(bytes32 message, bytes memory signature) public pure returns (address) {
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message));
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        return ecrecover(ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    function storeBatchEvidence(
        EvidenceData[] memory files,
        string memory batchId,
        address uploader,
        bytes memory signature
    ) public onlyInvestigatorOrAdmin(files[0].caseId) {
        require(files.length > 0, "No files in batch");

        // **Generate batch hash**
        bytes32 batchHash = getBatchDataHash(files, batchId, uploader);
        address recoveredSigner = recoverSigner(batchHash, signature);
        require(recoveredSigner == uploader, "Invalid batch signature");

        for (uint256 i = 0; i < files.length; i++) {
            EvidenceData memory evidenceData = files[i];

            evidenceRecords[evidenceData.id] = Evidence({
                id: evidenceData.id,
                name: evidenceData.name,
                ipfsHash: evidenceData.ipfsHash,
                sha256Hash: evidenceData.sha256Hash,
                mimeType: evidenceData.mimeType,
                uploader: recoveredSigner,
                timestamp: block.timestamp,
                isFolder: evidenceData.isFolder,
                parentId: evidenceData.parentId
            });

            if (bytes(evidenceData.parentId).length == 0) {
                caseEvidence[evidenceData.caseId].push(evidenceData.id);
            } else {
                folderContents[evidenceData.parentId].push(evidenceData.id);
            }

            emit EvidenceStored(evidenceData.caseId, evidenceData.parentId, evidenceData.id, evidenceData.name, evidenceData.isFolder);
        }
    }

    function getBatchDataHash(EvidenceData[] memory files, string memory batchId, address uploader) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(batchId, uploader, files.length));
    }



    function getLoginHash(string memory username,string memory password,address uploader) public pure returns (bytes32){
        return keccak256(abi.encodePacked(username,password,uploader));
    }


    function getCaseRootContents(string memory caseId) public view returns (string[] memory) {
        return caseEvidence[caseId]; 
    }

    function getFolderContents(string memory folderId) public view returns (string[] memory) {
        return folderContents[folderId];
    }

    function getFullCaseTree(string memory caseId) public view returns (string[] memory) {
        string[] memory rootFiles = caseEvidence[caseId]; 

        uint256 totalLength = rootFiles.length;
        for (uint256 i = 0; i < rootFiles.length; i++) {
            if (evidenceRecords[rootFiles[i]].isFolder) {
                totalLength += _getTotalNestedFiles(rootFiles[i]);
            }
        }

        string[] memory fullTree = new string[](totalLength);
        uint256 index = 0;

        for (uint256 i = 0; i < rootFiles.length; i++) {
            fullTree[index] = rootFiles[i];
            index++;

            if (evidenceRecords[rootFiles[i]].isFolder) {
                string[] memory nestedFiles = _getNestedFileIDs(rootFiles[i]);
                for (uint256 j = 0; j < nestedFiles.length; j++) {
                    fullTree[index] = nestedFiles[j];
                    index++;
                }
            }
        }

        return fullTree;
    }

    function _getNestedFileIDs(string memory parentId) internal view returns (string[] memory) {
        uint256 totalLength = _getTotalNestedFiles(parentId);
        string[] memory allFiles = new string[](totalLength);

        uint256 index = 0;
        for (uint256 i = 0; i < folderContents[parentId].length; i++) {
            string memory childId = folderContents[parentId][i];
            allFiles[index] = childId;
            index++;

            if (evidenceRecords[childId].isFolder) {
                string[] memory nestedFiles = _getNestedFileIDs(childId);
                for (uint256 j = 0; j < nestedFiles.length; j++) {
                    allFiles[index] = nestedFiles[j];
                    index++;
                }
            }
        }

        return allFiles;
    }

    function _getTotalNestedFiles(string memory parentId) internal view returns (uint256 count) {
        count = folderContents[parentId].length;
        for (uint256 i = 0; i < folderContents[parentId].length; i++) {
            string memory childId = folderContents[parentId][i];
            if (evidenceRecords[childId].isFolder) {
                count += _getTotalNestedFiles(childId);
            }
        }
    }
}


