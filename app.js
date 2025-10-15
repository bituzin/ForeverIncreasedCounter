const CONTRACT_ADDRESS = "0x68bc2d99240d335d2de59031fdde0d6d3bd5ec3e";
const CELO_CHAIN_ID = "0xa4ec";

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
        "inputs": [],
        "name": "counter",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

let web3;
let contract;
let isConnected = false;
let walletAddress = '';
let transactionHistory = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    const connectButton = document.getElementById('connectButton');
    const increaseButton = document.getElementById('increaseButton');
    const switchNetworkBtn = document.getElementById('switchNetworkBtn');
    
    connectButton.addEventListener('click', handleConnectClick);
    increaseButton.addEventListener('click', handleIncreaseClick);
    switchNetworkBtn.addEventListener('click', handleSwitchNetwork);
    
    document.getElementById('contractAddress').textContent = CONTRACT_ADDRESS;
    loadHistoryFromStorage();
    
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
}

async function handleConnectClick() {
    if (!isConnected) {
        await connectWallet();
    } else {
        disconnectWallet();
    }
}

async function handleIncreaseClick() {
    await increaseCounter();
}

async function handleSwitchNetwork() {
    await switchToCeloNetwork();
}

function loadHistoryFromStorage() {
    try {
        const possibleKeys = [
            'counterHistory',
            'foreverCounterHistory',
            'counterTransactions', 
            'increaseHistory',
            'transactionHistory',
            'allCounterHistory'
        ];
        
        let allTransactions = [];
        
        for (const key of possibleKeys) {
            const savedHistory = localStorage.getItem(key);
            if (savedHistory) {
                try {
                    const parsed = JSON.parse(savedHistory);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        allTransactions = [...allTransactions, ...parsed];
                    }
                } catch (e) {
                    console.log(`Error parsing history from ${key}:`, e);
                }
            }
        }
        
        allTransactions.sort((a, b) => {
            const timeA = a.timestamp || new Date(a.date).getTime() || 0;
            const timeB = b.timestamp || new Date(b.date).getTime() || 0;
            return timeB - timeA;
        });
        
        transactionHistory = allTransactions;
        
        if (transactionHistory.length > 0) {
            saveAllHistory();
        }
        
        updateHistoryDisplay();
        
    } catch (error) {
        console.error('Error loading history:', error);
        transactionHistory = [];
        updateHistoryDisplay();
    }
}

function saveAllHistory() {
    try {
        localStorage.setItem('allCounterHistory', JSON.stringify(transactionHistory));
    } catch (error) {
        console.error('Error saving history:', error);
    }
}

function updateHistoryDisplay() {
    const historyList = document.getElementById('historyList');
    
    if (transactionHistory.length === 0) {
        historyList.innerHTML = '<div class="history-item"><span class="history-date">No transactions yet</span><span class="history-address"></span></div>';
        return;
    }
    
    historyList.innerHTML = '';
    
    transactionHistory.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <span class="history-date">${item.date}</span>
            <span class="history-address">${item.address}</span>
        `;
        historyList.appendChild(historyItem);
    });
}

function addToHistory(walletAddr) {
    const now = new Date();
    const timestamp = now.getTime();
    const dateStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const newTransaction = {
        date: dateStr,
        address: `${walletAddr.substring(0, 6)}...${walletAddr.substring(walletAddr.length - 4)}`,
        timestamp: timestamp,
        id: `${timestamp}-${walletAddr}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    const exists = transactionHistory.some(tx => 
        tx.id === newTransaction.id || 
        (tx.timestamp === newTransaction.timestamp && tx.address === newTransaction.address && tx.date === newTransaction.date)
    );
    
    if (!exists) {
        transactionHistory.unshift(newTransaction);
        saveAllHistory();
        updateHistoryDisplay();
    }
}

function restoreOldTransactions() {
    const backupKeys = [
        'counterHistory',
        'foreverCounterHistory', 
        'counterTransactions',
        'increaseHistory',
        'transactionHistory'
    ];
    
    let restoredCount = 0;
    
    backupKeys.forEach(key => {
        const oldData = localStorage.getItem(key);
        if (oldData) {
            try {
                const oldTransactions = JSON.parse(oldData);
                if (Array.isArray(oldTransactions)) {
                    oldTransactions.forEach(tx => {
                        if (!tx.id) {
                            tx.id = `old-${new Date(tx.date).getTime()}-${tx.address}-${Math.random().toString(36).substr(2, 9)}`;
                        }
                        const exists = transactionHistory.some(existingTx => 
                            existingTx.id === tx.id
                        );
                        if (!exists) {
                            transactionHistory.push(tx);
                            restoredCount++;
                        }
                    });
                }
            } catch (e) {
                console.log(`Error restoring from ${key}:`, e);
            }
        }
    });
    
    if (restoredCount > 0) {
        transactionHistory.sort((a, b) => {
            const timeA = a.timestamp || new Date(a.date).getTime() || 0;
            const timeB = b.timestamp || new Date(b.date).getTime() || 0;
            return timeB - timeA;
        });
        
        saveAllHistory();
        updateHistoryDisplay();
    }
    
    return restoredCount;
}

async function checkNetwork() {
    const networkModal = document.getElementById('networkModal');
    
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

async function loadBlockchainData() {
    if (!contract) return;

    try {
        let counterValue;
        try {
            counterValue = await contract.methods.getCount().call();
        } catch (e) {
            try {
                counterValue = await contract.methods.counter().call();
            } catch (e2) {
                counterValue = 0;
            }
        }
        
        document.getElementById('counterValue').textContent = counterValue;

    } catch (error) {
        console.error('Error loading blockchain data:', error);
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

        document.getElementById('connectButton').textContent = 'Disconnect';
        document.getElementById('increaseButton').disabled = false;
        document.getElementById('walletAddress').textContent = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
        document.getElementById('walletInfo').style.display = 'block';
        
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = 'Connected to Celo Mainnet';
        statusDiv.className = 'status connected';

        await loadBlockchainData();

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

        const increaseButton = document.getElementById('increaseButton');
        increaseButton.disabled = true;
        increaseButton.textContent = 'Processing...';

        const accounts = await web3.eth.getAccounts();
        
        try {
            await contract.methods.increment().send({ from: accounts[0] });
        } catch (e) {
            try {
                await contract.methods.increase().send({ from: accounts[0] });
            } catch (e2) {
                alert('Error: Contract function not found. Check ABI.');
                increaseButton.disabled = false;
                increaseButton.textContent = 'Increase';
                return;
            }
        }

        await loadBlockchainData();
        addToHistory(walletAddress);

        increaseButton.disabled = false;
        increaseButton.textContent = 'Increase';

        alert('Transaction confirmed! Counter increased.');

    } catch (error) {
        console.error('Transaction error:', error);
        alert('Transaction failed: ' + error.message);
        
        const increaseButton = document.getElementById('increaseButton');
        increaseButton.disabled = false;
        increaseButton.textContent = 'Increase';
    }
}

function disconnectWallet() {
    isConnected = false;
    
    document.getElementById('connectButton').textContent = 'Connect Wallet';
    document.getElementById('increaseButton').disabled = true;
    document.getElementById('walletInfo').style.display = 'none';
    
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = 'Not Connected';
    statusDiv.className = 'status disconnected';
    
    document.getElementById('counterValue').textContent = '0';
}

setTimeout(() => {
    restoreOldTransactions();
}, 1000);