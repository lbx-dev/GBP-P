var ERC621 = artifacts.require('./ERC621.sol')

module.exports = function(deployer) {
    deployer.deploy(ERC621, 'name', 'sym', 18)
}
