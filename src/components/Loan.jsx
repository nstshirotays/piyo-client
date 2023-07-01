import React, { useState, useEffect, useCallback } from "react";
import PiyoCoinContract from "../contracts/PiyoCoin.json";
import PiyoBankContract from "../contracts/PiyoBank.json";
import Web3 from "web3";
import {
  Button,
  TextField,
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
}
from "@mui/material";
import RefreshIcon from '@mui/icons-material/Refresh';


// Mainコンポーネント：預金と引き出しの機能を提供
const Loan = () => {

  // ステート変数の定義
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [ethBalance, setEthBalance] = useState("");
  const [pycBalance, setPycBalance] = useState("");
  const [loanBalance, setLoanBalance] = useState("");
  const [loanAmount, setLoanAmount] = useState("0.0");

  const [piyoCoinContract, setPiyoCoinContract] = useState(null);
  //const [piyoCoinAddress, setPiyoCoinAddress] = useState("");
  const [piyoBankContract, setPiyoBankContract] = useState(null);
  const [piyoBankAddress, setPiyoBankAddress] = useState("");

  const [msg, setMsg] = useState("");
  const [msgDialogOpen, setMsgDialogOpen] = useState(false);
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);

  // ETH残高の取得
  const getEthBalance = useCallback(async (account) => {
    if (web3) {
      const balance = await web3.eth.getBalance(account);
      setEthBalance(web3.utils.fromWei(balance, "ether"));
    }
  }, [web3]);

  // PiyoCoin残高の取得
  const getPycBalance = useCallback(async (account) => {
    if (piyoCoinContract) {
      const balance = await piyoCoinContract.methods.balanceOf(account).call(); // callを追加
      setPycBalance(web3.utils.fromWei(balance, "ether"));
    }
  }, [piyoCoinContract, web3]);


  // 借入残高の取得
  const getloanBalance = useCallback(async (account) => {
    if (piyoBankContract) {
      const balance = await piyoBankContract.methods.collateralEth(account).call();
      setLoanBalance(web3.utils.fromWei(balance.toString(), "ether")); // toString()を追加
    }
  }, [piyoBankContract, web3]);

  // リフレッシュ処理
  const refreshBalances = async () => {
    await getEthBalance(account);
    await getPycBalance(account);
    await getloanBalance(account);
  };

  // 預け入れダイアログを表示する
  const loanHandleClickOpen = () => {
    setLoanDialogOpen(true);
  };

  // 預け入れダイアログを閉じ、残高を更新する
  const loanHandleClose = () => {
    setLoanDialogOpen(false);
    refreshBalances();
  };

  // メッセージダイアログを閉じ、残高を更新する
  const msgHandleClose = () => {
    setMsgDialogOpen(false);
    refreshBalances();
  };


  // アカウントの変更、コントラクト残高更新時にアカウント残高を取得する
  useEffect(() => {
    if (account) {
      getEthBalance(account);
      getPycBalance(account);
      getloanBalance(account);
    }
  }, [account, getEthBalance, getPycBalance, getloanBalance]);


  // 画面ロード時の初期化処理
  useEffect(() => {

    // 初期処理の定義
    const init = async () => {
      if (window.ethereum) {

        // Web3インスタンスの取得
        const web3Instance = new Web3(window.ethereum);
        setWeb3(() => web3Instance);
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(() => accounts[0]);

        // コントラクトの設定
        const networkIdBigInt = await web3Instance.eth.net.getId();
        const networkId = Number(networkIdBigInt);

        // piyo coin
        const deployedPiyoCoinNetwork = PiyoCoinContract.networks[networkId];
        const piyoCoinInstance = new web3Instance.eth.Contract(
          PiyoCoinContract.abi,
          deployedPiyoCoinNetwork && deployedPiyoCoinNetwork.address,
        );
        setPiyoCoinContract(piyoCoinInstance);
        //setPiyoCoinAddress(deployedPiyoCoinNetwork.address);

        // piyo bank
        const deployedPiyoBankNetwork = PiyoBankContract.networks[networkId];
        const piyoBankInstance = new web3Instance.eth.Contract(
          PiyoBankContract.abi,
          deployedPiyoBankNetwork && deployedPiyoBankNetwork.address,
        );
        setPiyoBankContract(piyoBankInstance);
        setPiyoBankAddress(deployedPiyoBankNetwork.address);

        getEthBalance(account);
        getPycBalance(account);
        getloanBalance(account);
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


  // loan関数：借入を実行する非同期関数
  async function loan() {
    try {
      setLoanDialogOpen(false);
      // 借り入れ金額をetherからweiに変換
      const amount = web3.utils.toWei(loanAmount, "ether");
      // コントラクトのloanメソッドを実行
      await piyoBankContract.methods.loan().send({ from: account, value: amount });
      // MSGに借り入れ金額を表示
      setMsg(`借り入れしました ${web3.utils.fromWei(amount, "ether")} ether.`);
      setMsgDialogOpen(true);
    }
    catch (error) {
      // エラーメッセージを表示
      setMsg(`Error: ${error.message}`);
      setMsgDialogOpen(true);
    }
  }

  // pay関数：返済を実行する非同期関数
  async function pay() {
    try {
      // 借り入れ金額をetherからweiに変換
      const amount = web3.utils.toWei(loanAmount*30, "ether");
      // PiyoCoinの引き出しを許可
      const result1 = await piyoCoinContract.methods.approve(piyoBankAddress,amount).send({ from: account });
      console.log("piyoCoinContract.methods.approve ",result1);
      // コントラクトのpayメソッドを実行
      const result2 = await piyoBankContract.methods.pay().send({ from: account });
      // 処理結果の表示
      setMsg(`返済しました status = ${result2.status}`);
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
            ローン・返済
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
    
          <Typography variant="h5" gutterBottom>Loan Balance</Typography>
          <Typography variant="body1" marginBottom={2}>{loanBalance}</Typography>
    
          <Grid container justifyContent="center" spacing={2} marginTop={4}>
            <Grid item>
              <Button variant="contained" color="primary" onClick={loanHandleClickOpen}>
                借り入れ
              </Button>
              <Dialog open={loanDialogOpen} onClose={loanHandleClose}>
                <DialogTitle>借り入れ</DialogTitle>
                <DialogContent>
                  <DialogContentText>
                    借り入れ金額を入力してください<br/>
                    単位はEtherです。<br/><br/>
                  </DialogContentText>
                  <TextField
                    id="outlined-number"
                    label="金額"
                    type="number"
                    InputLabelProps={{
                      shrink: true,
                    }}
                    value={loanAmount}
                    onChange={e => setLoanAmount(e.target.value)}
                  />

                </DialogContent>
                <DialogActions>
                  <Button onClick={loanHandleClose}>キャンセル</Button>
                  <Button onClick={loan}>借り入れ</Button>
                </DialogActions>
              </Dialog>

            </Grid>
            <Grid item>
              <Button variant="contained" color="secondary" onClick={pay}>
                返済
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

export default Loan;
