import React, { useState, useEffect, useCallback } from "react";
import PiyoCoinContract from "../contracts/PiyoCoin.json";
import PiyoBankContract from "../contracts/PiyoBank.json";
import Web3 from "web3";
import {
  Button,
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Grid,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton
} from "@mui/material";
import RefreshIcon from '@mui/icons-material/Refresh';


// Mainコンポーネント：Piyoコインの販売
const PiyoBuy = () => {

  // ステート変数の定義
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [ethBalance, setEthBalance] = useState("");
  const [pycBalance, setPycBalance] = useState("");
  const [piyoCoinContract, setPiyoCoinContract] = useState(null);
  const [piyoBankContract, setPiyoBankContract] = useState(null);
  const [msg, setMsg] = useState("");
  const [msgDialogOpen, setMsgDialogOpen] = useState(false);

  const msgHandleClose = () => {
    setMsgDialogOpen(false);
    getEthBalance(account);
    getPycBalance(account);
  };

  // アカウントETH残高の取得
  const getEthBalance = useCallback(async (account) => {
    if (web3) {
      const balance = await web3.eth.getBalance(account);
      setEthBalance(web3.utils.fromWei(balance, "ether"));
    }
  }, [web3]);

  // アカウントPiyoCoin残高の取得
  const getPycBalance = useCallback(async (account) => {
    if (piyoCoinContract) {
      const balance = await piyoCoinContract.methods.balanceOf(account).call(); // callを追加
      setPycBalance(web3.utils.fromWei(balance, "ether"));
    }
  }, [piyoCoinContract, web3]);


  // リフレッシュ処理
  const refreshBalances = async () => {
    await getEthBalance(account);
    await getPycBalance(account);
  };

  // アカウントの変更、コントラクト残高更新時にアカウント残高を取得する
  useEffect(() => {
    if (account) {
      getEthBalance(account);
      getPycBalance(account);
    }
  }, [account, getEthBalance, getPycBalance]);


  // 画面ロード時の初期化処理
  useEffect(() => {
    // 初期処理
    const init = async () => {
      if (window.ethereum) {
        const web3Instance = new Web3(window.ethereum);
        setWeb3(() => web3Instance);
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(() => accounts[0]);
        // コントラクトの設定
        const networkIdBigInt = await web3Instance.eth.net.getId();
        const networkId = Number(networkIdBigInt);
        const deployedPiyoCoinNetwork = PiyoCoinContract.networks[networkId];
        // piyo coin
        const piyoCoinInstance = new web3Instance.eth.Contract(
          PiyoCoinContract.abi,
          deployedPiyoCoinNetwork && deployedPiyoCoinNetwork.address,
        );
        setPiyoCoinContract(piyoCoinInstance);

        // piyo bank
        const deployedPiyoBankNetwork = PiyoBankContract.networks[networkId];
        const piyoBankInstance = new web3Instance.eth.Contract(
          PiyoBankContract.abi,
          deployedPiyoBankNetwork && deployedPiyoBankNetwork.address,
        );
        setPiyoBankContract(piyoBankInstance);

        getEthBalance(account);
        getPycBalance(account);
      }
      else {
        alert("Please install MetaMask.");
      }
    };

    // アカウント変更とネットワーク変更のリスナーを登録する
    const ethereum = window.ethereum;
    if (ethereum) {
      ethereum.on("accountsChanged", (accounts) => {
        setAccount(accounts[0]);
      });

      ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }

    init();

    // コンポーネントがアンマウントされる際にイベントリスナーを削除する
    return () => {
      if (ethereum) {
        ethereum.removeListener("accountsChanged", setAccount);
        ethereum.removeListener("chainChanged", () => window.location.reload());
      }
    };
  }, []);


  // piyobuy関数：PIYOコインを購入する非同期関数
  async function piyobuy() {
    try {
      // 0.1etherからweiに変換
      const amount = web3.utils.toWei("0.1", "ether");
      // コントラクトのchange2piyoメソッドを実行
      await piyoBankContract.methods.change2piyo().send({ from: account, value: amount });
      // 金額を表示
      setMsg(`0.1ETHをピヨコインと交換しました`);
      setMsgDialogOpen(true);
    }
    catch (error) {
      // エラーメッセージを表示
      setMsg(`Error: ${error.message}`);
      setMsgDialogOpen(true);
    }
  }

  if (!web3 || !account) {
    // web3、アカウント、がまだロードされていない場合
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100vh', 
          textAlign: 'center'
        }}>
        <CircularProgress />
        <h4>Loading...</h4>
      </Box>
    );
  }

  return (
    <Card sx={{ margin: "6px" }}>
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box display="flex" alignItems="center">
          <Typography variant="h4" component="div">
            PIYOコインの購入
          </Typography>
          <IconButton style={{ marginLeft: '10px' }} onClick={refreshBalances}>
            <RefreshIcon />
          </IconButton>
        </Box>
  
        <Box>
          <Typography variant="h5" gutterBottom>Account</Typography>
          <Typography variant="body1" marginBottom={2}>{account}</Typography>
          
          <Typography variant="h5" gutterBottom>ETH Balance</Typography>
          <Typography variant="body1" marginBottom={2}>{ethBalance}</Typography>
    
          <Typography variant="h5" gutterBottom>PYC Balance</Typography>
          <Typography variant="body1" marginBottom={2}>{pycBalance}</Typography>
    
          <Grid container justifyContent="center" spacing={2} marginTop={4}>
            <Grid item>
              <Button variant="contained" color="primary" onClick={piyobuy}>
                購入
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Dialog
          open={msgDialogOpen}
          onClose={msgHandleClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">
            メッセージ
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              {msg}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={msgHandleClose} autoFocus>
              確認
            </Button>
          </DialogActions>
        </Dialog>

      </CardContent>
    </Card>
  );
};

export default PiyoBuy;
