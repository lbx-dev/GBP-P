pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol"; // TODO: do we need this? already in ERC20 for _mint/_burn

contract ERC621 is
    Ownable,
    ERC20,
    ERC20Detailed
{
    using SafeMath for uint256; // TODO: do we need this? already in ERC20 for _mint/_burn

    constructor(string name, string symbol, uint8 decimals) public ERC20Detailed(name, symbol, decimals) {}

    // For ERC621 https://github.com/ethereum/EIPs/pull/621
    function increaseSupply(uint value, address to) public onlyOwner returns (bool) {
        _mint(to, value); // uint -> unit256 (safe conversion b/c they are aliases of eachother)
        return true;
    }

    // For ERC621 https://github.com/ethereum/EIPs/pull/621
    function decreaseSupply(uint value, address from) public onlyOwner returns (bool) {
        _burn(from, value); // uint -> unit256 (safe conversion b/c they are aliases of eachother)
        return true;
    }
}
