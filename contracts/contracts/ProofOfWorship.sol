// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface ITempleVault {
    function cardOf(address) external view returns (uint256);
}

/// @notice Proof of Worship — the Demiurge rewards only sincere prayers.
///         An off-chain LLM (the Evaluator AI) judges a player's prayer; if it
///         deems it sincere it returns an EIP-712 signature from `worshipSigner`.
///         The player submits that pass here to release a USDY worship reward.
///
///         Purely ADDITIVE — touches no existing contract (TempleVault,
///         BlessingDistributor, CivilizationLog). It only reads TempleVault.cardOf
///         to confirm the caller is a staked Disciple, and never custodies anyone
///         else's funds — its only outflow is the reward pool the operator funds.
contract ProofOfWorship is EIP712, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdy;
    ITempleVault public immutable vault;

    address public worshipSigner;    // the AI's attestation key
    uint256 public rewardPerWorship; // USDY (6 decimals) paid per sincere prayer

    // one worship reward per disciple per UTC day index
    mapping(address => mapping(uint256 => bool)) public worshipped;

    bytes32 private constant PASS_TYPEHASH =
        keccak256("WorshipPass(address disciple,uint256 day,uint8 score)");

    error NotDisciple();
    error AlreadyWorshipped();
    error BadPrayerPass();
    error PoolEmpty();

    event Worshipped(address indexed disciple, uint256 indexed day, uint8 score, uint256 reward);
    event SignerUpdated(address indexed newSigner);
    event RewardUpdated(uint256 newReward);

    constructor(address _usdy, address _vault, address _signer, uint256 _reward)
        EIP712("CultProofOfWorship", "1")
        Ownable(msg.sender)
    {
        usdy = IERC20(_usdy);
        vault = ITempleVault(_vault);
        worshipSigner = _signer;
        rewardPerWorship = _reward;
    }

    /// @notice Submit the AI-signed prayer pass to receive today's worship reward.
    /// @param day   UTC day index (block.timestamp / 1 days, == Math.floor(Date.now()/86400000))
    /// @param score the sincerity grade the AI assigned (bound into the signature)
    /// @param signature EIP-712 signature over WorshipPass(msg.sender, day, score) by worshipSigner
    function worship(uint256 day, uint8 score, bytes calldata signature) external {
        if (vault.cardOf(msg.sender) == 0) revert NotDisciple();
        if (worshipped[msg.sender][day]) revert AlreadyWorshipped();

        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(PASS_TYPEHASH, msg.sender, day, score))
        );
        if (ECDSA.recover(digest, signature) != worshipSigner) revert BadPrayerPass();

        if (usdy.balanceOf(address(this)) < rewardPerWorship) revert PoolEmpty();

        // checks-effects-interactions: mark before paying
        worshipped[msg.sender][day] = true;
        usdy.safeTransfer(msg.sender, rewardPerWorship);

        emit Worshipped(msg.sender, day, score, rewardPerWorship);
    }

    /// @notice Has this disciple already claimed their worship reward today?
    function hasWorshipped(address disciple, uint256 day) external view returns (bool) {
        return worshipped[disciple][day];
    }

    // ── funding / admin ──────────────────────────────────────────────────────
    /// @notice Top up the worship pool (caller must approve USDY first).
    function fund(uint256 amount) external {
        usdy.safeTransferFrom(msg.sender, address(this), amount);
    }

    function setSigner(address _signer) external onlyOwner {
        worshipSigner = _signer;
        emit SignerUpdated(_signer);
    }

    function setReward(uint256 _reward) external onlyOwner {
        rewardPerWorship = _reward;
        emit RewardUpdated(_reward);
    }

    /// @notice Recover unused pool funds.
    function sweep(address to, uint256 amount) external onlyOwner {
        usdy.safeTransfer(to, amount);
    }
}
