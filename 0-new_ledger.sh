#! /bin/bash

env SMART_CONTRACTS_ENABLED=true ETH_NODE=http://ethnode.chain.cloud:8545 ETH_CREATOR_ADDRESS=0xb9af8aa42c97f5a1f73c6e1a683c4bf6353b83e7 node scripts/0-new_ledger.js
