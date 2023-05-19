## *********************
## * Pool 🎱 and Drink *
## *********************

.PHONY: test

# Build target
build:
	npx hardhat compile
	forge compile

# Clean target
test:
	npx hardhat test
	forge test
