import React, { useState, useEffect, useCallback } from "react";
import DquakeContract from "../contracts/Dquake.json";
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
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
}
from "@mui/material";
import RefreshIcon from '@mui/icons-material/Refresh';
import CitySelector from './CitySelector';


// Mainコンポーネント：預金と引き出しの機能を提供
const Quake = () => {

  // ステート変数の定義
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [ethBalance, setEthBalance] = useState("");
  const [premiumBalance, sePemiumBalance] = useState("");
  const [premiumAmount, setPremiumAmount] = useState("0.0");

  const [dquakeContract, setDquakeContract] = useState(null);
  //const [dquakeAddress, setDquakeAddress] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  const [cityCode, setCityCode] = useState(0);
  const [insData, setInsData] = useState([]);

  const [msg, setMsg] = useState("");
  const [msgDialogOpen, setMsgDialogOpen] = useState(false);
  const [dquakeDialogOpen, setDquakeDialogOpen] = useState(false);


  // ETH残高の取得
  const getEthBalance = useCallback(async (account) => {
    if (web3) {
      const balance = await web3.eth.getBalance(account);
      setEthBalance(web3.utils.fromWei(balance, "ether"));
    }
  }, [web3]);

  // 支払済み保険料の取得
  const getPremiumBalance = useCallback(async (account) => {
    if (dquakeContract) {
      const balance = await dquakeContract.methods.premium_balance(account).call();
      sePemiumBalance(web3.utils.fromWei(balance.toString(), "ether")); // toString()を追加
    }
  }, [dquakeContract, web3]);

  // 契約済みのデータを取得する
  const fetchInsData = useCallback(async () => {
    if (dquakeContract) {
      const lengthBigInt = await dquakeContract.methods.getAgreementsLength().call();
      const length = Number(lengthBigInt); // BigIntをnumberに変換
      const data = await Promise.all(
        Array.from({ length }, (_, i) => dquakeContract.methods.agreements(i).call())
      );
      setInsData(data);
    }
  }, [dquakeContract, web3]);


  // リフレッシュ処理
  const refreshBalances = async () => {
    await getEthBalance(account);
    await getPremiumBalance(account);
    await fetchInsData();
  };

  // 契約ダイアログを表示する
  const premiumHandleClickOpen = () => {
    setDquakeDialogOpen(true);
  };

  // 契約れダイアログを閉じ、残高を更新する
  const premiumHandleClose = () => {
    setDquakeDialogOpen(false);
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
      getPremiumBalance(account);
      setIsOwner(ownerAddress.toLowerCase() === account);
    }
  }, [account, getEthBalance, getPremiumBalance]);





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

        // Dquakeコントラクト
        const deployedDquakeNetwork = DquakeContract.networks[networkId];
        const dquakeInstance = new web3Instance.eth.Contract(
          DquakeContract.abi,
          deployedDquakeNetwork && deployedDquakeNetwork.address,
        );
        setDquakeContract(dquakeInstance);

        const address = await dquakeInstance.methods.contractOwner().call();
        setOwnerAddress(address);
        setIsOwner(address.toLowerCase() === accounts[0]);


        const lengthBigInt = await dquakeInstance.methods.getAgreementsLength().call();
        const length = Number(lengthBigInt); // BigIntをnumberに変換
        const data = await Promise.all(
          Array.from({ length }, (_, i) => dquakeInstance.methods.agreements(i).call())
        );
        setInsData(data);


        await getEthBalance(account);
        await getPremiumBalance(account);
        await fetchInsData();

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


  const handleCitySelect = (cityCode) => {
    // 市区町村コードは５桁＋１桁のチェックデジット
    // 地震情報における地域ごとのコードは、市区町村コード５桁＋00
    const newCityCode = cityCode.slice(0, -1) + '00';
    setCityCode(newCityCode);
  };

  // 保険契約を実行する非同期関数
  async function createContract() {
    try {
      setDquakeDialogOpen(false);
      // 保険金額をetherからweiに変換
      const amount = web3.utils.toWei(premiumAmount, "ether");
      // コントラクトのcreateContractメソッドを実行
      await dquakeContract.methods.createContract(Number(cityCode)).send({ from: account, value: amount });
      // MSGを表示
      setMsg(`地震保険に加入しました ${web3.utils.fromWei(amount, "ether")} ether.`);
      setMsgDialogOpen(true);
    }
    catch (error) {
      // エラーメッセージを表示
      setMsg(`Error: ${error.message}`);
      setMsgDialogOpen(true);
    }
  }

  // 契約解除を実行する非同期関数
  async function withdrawContract() {
    try {
      const result = await dquakeContract.methods.withdrawContract().send({ from: account });
      // 処理結果の表示
      setMsg(`解約しました status = ${result.status}`);
      setMsgDialogOpen(true);
    }
    catch (error) {
      // エラーメッセージを表示
      setMsg(`Error: ${error.message}`);
      setMsgDialogOpen(true);
    }
  }

  // 全契約の解除を実行する非同期関数
  async function exodusContract() {
    try {
      const result = await dquakeContract.methods.exodusContract().send({ from: account });
      // 処理結果の表示
      setMsg(`すべての契約を解約し収益を取得しました status = ${result.status}`);
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
            地震保険
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
    
          <Typography variant="h5" gutterBottom>Premium Balance</Typography>
          <Typography variant="body1" marginBottom={2}>{premiumBalance}</Typography>
    
          <Typography variant="h5" gutterBottom>Contract Owner</Typography>
          <Typography variant="body1" marginBottom={2}>{ownerAddress}</Typography>
      
          <TableContainer component={Paper}>
            <Table aria-label="simple table">
              <TableHead>
                <TableRow>
                  <TableCell>Owner</TableCell>
                  <TableCell>Town Code</TableCell>
                  <TableCell>Live</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {insData.map((agreement, index) => (
                  <TableRow key={index}>
                    <TableCell>{agreement.owner}</TableCell>
                    <TableCell>{agreement.town_code.toString()}</TableCell>
                    <TableCell>{agreement.live ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
    
    
          <Grid container justifyContent="center" spacing={2} marginTop={4}>
            <Grid item>
              <Button variant="contained" color="primary" onClick={premiumHandleClickOpen}>
                保険加入
              </Button>
              <Dialog open={dquakeDialogOpen} onClose={premiumHandleClose}>
                <DialogTitle>保険加入</DialogTitle>
                <DialogContent>
                  <DialogContentText>
                    <CitySelector  onCitySelecter={handleCitySelect}/>
                    <br />
                    保険加入金額を入力してください<br/>
                    単位はEtherです。<br/><br/>
                  </DialogContentText>
                  <TextField
                    id="outlined-number"
                    label="金額"
                    type="number"
                    InputLabelProps={{
                      shrink: true,
                    }}
                    value={premiumAmount}
                    onChange={e => setPremiumAmount(e.target.value)}
                  />

                </DialogContent>
                <DialogActions>
                  <Button onClick={premiumHandleClose}>キャンセル</Button>
                  <Button onClick={createContract}>保険加入</Button>
                </DialogActions>
              </Dialog>

            </Grid>
            <Grid item>
              <Button variant="contained" color="secondary" onClick={withdrawContract}>
                保険解約
              </Button>
            </Grid>
            {isOwner && <Grid item>
              <Button variant="contained" color="secondary" onClick={exodusContract}>
                全契約の解除
              </Button>
            </Grid>
            }
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

export default Quake;
