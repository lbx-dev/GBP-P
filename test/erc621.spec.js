const ERC621 = artifacts.require('ERC621')
const BigNumber = require('bignumber.js')

const revertedErrorRegex = /VM Exception while processing transaction: revert/
const maximumUint256 = new BigNumber('2').pow(256).minus(1)

contract('ERC621', function([owner, nonOwner, ...accounts]) {
    it('instantiates successfully', async () => {
        const instance = await ERC621.new('name', 'sym', 18)

        expect(instance).not.to.be.an('undefined')
    })

    const expectedContractMethodCount = 17
    it(`has ${expectedContractMethodCount} methods`, async () => {
        const instance = await ERC621.new('name', 'sym', 18)

        const abiMethods = instance.abi.filter((a) => a.type === 'function')
        const methodNames = abiMethods.map((a) => a.name)
        // console.log({ methodNames })

        expect(methodNames).to.have.lengthOf(expectedContractMethodCount)
    })

    it('uses its 1st contstructor param as the token "name"', async () => {
        const ERC621Args = ['test NetToken instance', 'SYM', 18]
        const instance = await ERC621.new(...ERC621Args)

        const name = await instance.name()

        expect(name).to.equal(ERC621Args[0])
    })

    it('uses its 2nd contstructor param as the token "symbol"', async () => {
        const ERC621Args = ['test NetToken instance', 'SYM', 18]
        const instance = await ERC621.new(...ERC621Args)

        const symbol = await instance.symbol()

        expect(symbol).to.equal(ERC621Args[1])
    })

    it('uses its 3rd contstructor param as the token "decimals"', async () => {
        const ERC621Args = ['test NetToken instance', 'SYM', 18]
        const instance = await ERC621.new(...ERC621Args)

        const decimals = (await instance.decimals()).toNumber()

        expect(decimals).to.equal(ERC621Args[2])
    })

    it('is constructed with the owner having zero balance', async () => {
        const instance = await ERC621.new('name', 'sym', 18)

        await assertOwnerBalance(instance, 0)
    })

    // see https://github.com/ethereum/EIPs/pull/621
    describe('ERC-621 functionality', () => {
        describe('calling as owner account', () => {
            it('can increaseSupply (of owner account)', async () => {
                const instance = await ERC621.new('name', 'sym', 18)

                await instance.increaseSupply(42, owner, { from: owner })

                await assertOwnerBalance(instance, 42)
            })

            it('can increaseSupploy (of non-owner account)', async () => {
                const instance = await ERC621.new('name', 'sym', 18)

                await instance.increaseSupply(42, nonOwner, { from: owner })

                await assertBalance(instance, 42, nonOwner)
                await assertOwnerBalance(instance, 0)
            })

            it('handles sending values up -> max uint256 value (as string)', async () => {
                const instance = await ERC621.new('name', 'sym', 18)

                const maxInt = maximumUint256.toString()
                await instance.increaseSupply(maxInt, owner, { from: owner })

                await assertOwnerBalance(instance, maximumUint256.toNumber())
            })

            it('reverts increaseSupply calls that would cause integer overflow', async () => {
                const instance = await ERC621.new('name', 'sym', 18)

                try {
                    const moreThanMaxUint = maximumUint256.plus(1).toString()
                    await instance.increaseSupply(moreThanMaxUint, owner, {
                        from: owner,
                    })
                    expect.fail()
                } catch (e) {
                    expect(e)
                        .to.be.an('error')
                        .that.matches(revertedErrorRegex)
                }
                await assertOwnerBalance(instance, 0)
            })

            it('reverts decreaseSupply calls that would result in balance < zero', async () => {
                const startingBalance = 42
                const instance = await ERC621.new('name', 'sym', 18)
                await instance.increaseSupply(startingBalance, owner, {
                    from: owner,
                })

                const amountToDecreaseSupply = startingBalance + 1
                try {
                    await instance.decreaseSupply(
                        amountToDecreaseSupply,
                        owner,
                        { from: owner },
                    )
                    expect.fail()
                } catch (e) {
                    expect(e)
                        .to.be.an('error')
                        .that.matches(revertedErrorRegex)
                }

                await assertOwnerBalance(instance, startingBalance)
            })

            it('can decreaseSupply (of owner account)', async () => {
                const startingBalance = 42
                const instance = await ERC621.new('name', 'sym', 18)
                await instance.increaseSupply(startingBalance, owner, {
                    from: owner,
                })

                const amountToDecreaseSupply = 24
                await instance.decreaseSupply(amountToDecreaseSupply, owner, {
                    from: owner,
                })

                const expectedBalance = startingBalance - amountToDecreaseSupply
                await assertOwnerBalance(instance, expectedBalance)
            })

            it('can decreaseSupply (of non-owner account)', async () => {
                const startingBalance = 42
                const instance = await ERC621.new('name', 'sym', 18)
                await instance.increaseSupply(startingBalance, nonOwner, {
                    from: owner,
                })

                const amountToDecreaseSupply = 24
                await instance.decreaseSupply(
                    amountToDecreaseSupply,
                    nonOwner,
                    { from: owner },
                )

                await assertOwnerBalance(instance, 0)
                const expectedBalance = startingBalance - amountToDecreaseSupply
                await assertBalance(instance, expectedBalance, nonOwner)
            })
        })

        describe('calling as non-owner account', () => {
            it('cannot increaseSupply', async () => {
                const instance = await ERC621.new('name', 'sym', 18)

                try {
                    await instance.increaseSupply(42, owner, { from: nonOwner })
                    expect.fail()
                } catch (e) {
                    expect(e)
                        .to.be.an('error')
                        .that.matches(revertedErrorRegex)
                }
                await assertOwnerBalance(instance, 0)
            })

            it('cannot decreaseSupply', async () => {
                const startingBalance = 42
                const instance = await ERC621.new('name', 'sym', 18)
                await instance.increaseSupply(startingBalance, owner, {
                    from: owner,
                })

                try {
                    const amountToDecreaseSupply = 24
                    await instance.decreaseSupply(
                        amountToDecreaseSupply,
                        owner,
                        { from: nonOwner },
                    )
                    expect.fail()
                } catch (e) {
                    expect(e)
                        .to.be.an('error')
                        .that.matches(revertedErrorRegex)
                }

                await assertOwnerBalance(instance, startingBalance)
            })
        })
    })

    async function assertOwnerBalance(instance, value) {
        return assertBalance(instance, value, owner)
    }

    async function assertBalance(instance, value, account) {
        const balance = (await instance.balanceOf(account)).toNumber()
        expect(balance).to.equal(value)
    }
})
