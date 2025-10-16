const CONTRACT_ADDRESS = "0x68bc2d99240d335d2de59031fdde0d6d3bd5ec3e";
const CELO_CHAIN_ID = "0xa4ec";
const CELOSCAN_URL = "https://celoscan.io/tx/";
const CONTRACT_CELOSCAN_URL = "https://celoscan.io/address/0x68bc2d99240d335d2de59031fdde0d6d3bd5ec3e";

const CONTRACT_ABI = [
    {
        "inputs": [],
        "name": "increment",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getCount",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "newCount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "increasedBy",
                "type": "address"
            }
        ],
        "name": "CounterIncreased",
        "type": "event"
    }
];

let web3;
let contract;
let isConnected = false;
let walletAddress = '';
let lastTransactionHash = '';

const connectButton = document.getElementById('connectButton');
const increaseButton = document.getElementById('increaseButton');
const counterDisplay = document.getElementById('counterValue');
const walletInfo = document.getElementById('walletInfo');
const walletAddressSpan = document.getElementById('walletAddress');
const statusDiv = document.getElementById('status');
const historyList = document.getElementById('historyList');
const contractAddressSpan = document.getElementById('contractAddress');
const networkModal = document.getElementById('networkModal');
const switchNetworkBtn = document.getElementById('switchNetworkBtn');
const lastTxLink = document.getElementById('lastTxLink');

contractAddressSpan.textContent = CONTRACT_ADDRESS;

async function loadTransactionHistory() {
    if (!contract) return;

    try {
        historyList.innerHTML = '<div class="history-item"><span class="history-date">Loading history from blockchain...</span><span class="history-address"></span></div>';

        const currentBlock = await web3.eth.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 50000);

        const events = await contract.getPastEvents('CounterIncreased', {
            fromBlock: fromBlock,
            toBlock: 'latest'
        });

        if (events.length === 0) {
            historyList.innerHTML = '<div class="history-item"><span class="history-date">No transactions yet</span><span class="history-address"></span></div>';
            return;
        }

        displayEventsHistory(events);

    } catch (error) {
        console.error('Error loading events:', error);
        historyList.innerHTML = '<div class="history-item"><span class="history-date">Error loading history</span><span class="history-address"></span></div>';
    }
}

async function displayEventsHistory(events) {
    historyList.innerHTML = '';

    // Ogranicz do 10 ostatnich i odwróć kolejność (najnowsze na górze)
    const recentEvents = events.slice(-10).reverse();

    for (const event of recentEvents) {
        try {
            const block = await web3.eth.getBlock(event.blockNumber);
            const timestamp = block.timestamp * 1000;
            const date = new Date(timestamp).toLocaleString();
            const sender = event.returnValues.increasedBy;
            const count = event.returnValues.newCount;

            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <span class="history-date">${date}</span>
                <span class="history-address">${sender.substring(0, 6)}...${sender.substring(sender.length - 4)}</span>
            `;
            historyList.appendChild(historyItem);
        } catch (error) {
            console.error('Error processing event:', error);
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <span class="history-date">Block #${event.blockNumber}</span>
                <span class="history-address">${event.returnValues.increasedBy.substring(0, 6)}...${event.returnValues.increasedBy.substring(event.returnValues.increasedBy.length - 4)}</span>
            `;
            historyList.appendChild(historyItem);
        }
    }
}

function listenToEvents() {
    if (!contract) return;

    contract.events.CounterIncreased({
        fromBlock: 'latest'
    })
    .on('data', (event) => {
        console.log('New counter increase detected:', event);
        // Odśwież licznik i historię
        loadBlockchainData();
    })
    .on('error', (error) => {
        console.error('Error listening to events:', error);
    });
}

function updateLastTxLink(txHash) {
    if (txHash) {
        lastTxLink.href = `${CELOSCAN_URL}${txHash}`;
        lastTxLink.style.display = 'block';
        lastTxLink.textContent = 'View your transaction on CeloScan';
    } else {
        lastTxLink.style.display = 'none';
    }
}

async function checkNetwork() {
    if (window.ethereum) {
        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId === CELO_CHAIN_ID) {
                networkModal.style.display = 'none';
                return true;
            } else {
                networkModal.style.display = 'flex';
                return false;
            }
        } catch (error) {
            return false;
        }
    }
    return false;
}

async function switchToCeloNetwork() {
    if (!window.ethereum) return;
    
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CELO_CHAIN_ID }],
        });
        setTimeout(checkNetwork, 1000);
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: CELO_CHAIN_ID,
                        chainName: "Celo Mainnet",
                        nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
                        rpcUrls: ["https://forno.celo.org"],
                        blockExplorerUrls: ["https://celoscan.io/"]
                    }],
                });
                setTimeout(checkNetwork, 1000);
            } catch (addError) {
                console.log('Error adding network');
            }
        }
    }
}

function initContract() {
    if (typeof window.ethereum !== 'undefined') {
        web3 = new Web3(window.ethereum);
        contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
        return true;
    }
    return false;
}

// POPRAWIONA FUNKCJA: Odświeża zarówno licznik jak i historię
async function loadBlockchainData() {
    if (!contract) return;

    try {
        const counterValue = await contract.methods.getCount().call();
        counterDisplay.textContent = counterValue;
        
        // ODŚWIEŻ HISTORIĘ RAZEM Z LICZNIKIEM
        await loadTransactionHistory();
        
    } catch (error) {
        console.error('Error loading blockchain data:', error);
        counterDisplay.textContent = '0';
    }
}

async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask or a Celo-compatible wallet!');
            return;
        }

        const correctNetwork = await checkNetwork();
        if (!correctNetwork) {
            return;
        }

        if (!initContract()) {
            alert('Error initializing contract');
            return;
        }

        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        walletAddress = accounts[0];
        isConnected = true;

        connectButton.textContent = 'Disconnect';
        increaseButton.disabled = false;
        walletAddressSpan.textContent = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
        walletInfo.style.display = 'block';
        statusDiv.textContent = 'Connected to Celo Mainnet';
        statusDiv.className = 'status connected';

        await loadBlockchainData();
        listenToEvents();

    } catch (error) {
        console.error('Connection error:', error);
        alert('Failed to connect wallet. Please try again.');
    }
}

async function increaseCounter() {
    if (!isConnected || !contract) {
        alert('Please connect your wallet first');
        return;
    }

    try {
        const correctNetwork = await checkNetwork();
        if (!correctNetwork) {
            return;
        }

        increaseButton.disabled = true;
        increaseButton.textContent = 'Processing...';
        lastTxLink.style.display = 'none';

        const accounts = await web3.eth.getAccounts();
        
        // Wyślij transakcję i poczekaj na potwierdzenie
        const transaction = await contract.methods.increment().send({ from: accounts[0] });
        
        // Zapisz hash transakcji
        lastTransactionHash = transaction.transactionHash;
        
        // Odśwież licznik i historię natychmiast
        await loadBlockchainData();
        
        // Pokaż link do transakcji
        updateLastTxLink(lastTransactionHash);

        increaseButton.disabled = false;
        increaseButton.textContent = 'Increase';

        alert('Transaction confirmed! Counter increased.');

    } catch (error) {
        console.error('Transaction error:', error);
        alert('Transaction failed: ' + error.message);
        increaseButton.disabled = false;
        increaseButton.textContent = 'Increase';
        lastTxLink.style.display = 'none';
    }
}

function disconnectWallet() {
    isConnected = false;
    connectButton.textContent = 'Connect Wallet';
    increaseButton.disabled = true;
    walletInfo.style.display = 'none';
    statusDiv.textContent = 'Not Connected';
    statusDiv.className = 'status disconnected';
    counterDisplay.textContent = '0';
    historyList.innerHTML = '<div class="history-item"><span class="history-date">No transactions yet</span><span class="history-address"></span></div>';
    lastTxLink.style.display = 'none';
}

connectButton.addEventListener('click', async () => {
    if (!isConnected) {
        await connectWallet();
    } else {
        disconnectWallet();
    }
});

increaseButton.addEventListener('click', increaseCounter);
switchNetworkBtn.addEventListener('click', switchToCeloNetwork);

if (window.ethereum) {
    checkNetwork();
    
    window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
            if (accounts.length > 0) {
                setTimeout(() => {
                    initContract();
                    connectWallet();
                }, 500);
            }
        });
}
