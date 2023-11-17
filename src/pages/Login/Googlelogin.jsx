import React from "react";
import "./Login.css";
import { useState, useEffect } from "react";
import { useCookies } from "react-cookie";
import {
  loginUser,
  registerUser,
  loginProvider,
  addWallet,
  getWallet,
  googleSignIn,
} from "../../api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess, hasExternalWallet } from "../../reducers/authSlicer";
import { useNavigate } from "react-router-dom";
import Logo from "../../data/Logo.png";
import { API_KEY, sponsorAddress } from "../../Address";
import { faucetContract } from "../../ethereum/faucet";
import { contractAddress, customerToken } from "../../Address";
import { ethers } from "ethers";


const GoogleLogin = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // password visibility
  const [selectedType, setSelectedType] = useState("customer");
  const [metaAddress, setMetaAddress] = useState("");
  const [signer, setSigner] = useState();
  const [fcContract, setFcContract] = useState();
  const [isChecked, setIsChecked] = useState(true);
  
  
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const externalWallet = useSelector((state) => state.auth.externalWallet);
  // console.log("ex", externalWallet)
  const navigate = useNavigate();

  const [cookies, setCookie] = useCookies(["walletAddress"]);

  const walletAddress = cookies.walletAddress || null;

  const updateWalletAddress = (address) => {
    setCookie("walletAddress", address, { path: "/" });
  };

  const {
    FunWallet,
    Auth,
    configureEnvironment,
    generatePrivateKey,
    Goerli,
  } = require("@funkit/core");

  // Generate a private key for the wallet
  const PRIVATE_KEY = generatePrivateKey();
  // console.log("PRIVATE_KEY:", PRIVATE_KEY);

  const options = {
    chain: Goerli,
    gasSponsor: {
      sponsorAddress: sponsorAddress,
    },
    apiKey: API_KEY,
  };

  // Configure the environment with the specified options
  configureEnvironment(options);
  
  const createWallet = async (is_provider) => {
    try {
      const auth = new Auth({ privateKey: PRIVATE_KEY });
      
      const funWallet = new FunWallet({
        users: [{ userId: await auth.getAddress() }],
        uniqueId: await auth.getWalletUniqueId(),
      });
      
      const userOp = await funWallet.create(auth, await auth.getAddress());
      const walletAddress = userOp.walletAddr;
      updateWalletAddress(walletAddress);
      
      const token = localStorage.getItem("jwtToken");

      // Send Wallet Address to backend
      const walletResponse = await addWallet(walletAddress, is_provider, token); 
      // console.log("store", walletResponse)

      // Validate if the response from addWallet indicates success
      if (!walletResponse || walletResponse.error) {
          throw new Error('Failed to save the wallet address to the backend.');
      }

      console.log("Wallet Address saved:", walletAddress);
      return walletAddress; // Returning the new wallet address
    } catch (error) {
      console.error("Error creating wallet:", error);
      throw error;  // Propagate the error to be handled in the calling function
    }
};


// const [externalWallet, setExternalWallet] = useState(true);

const handleLoginClick = async (e) => {
  e.preventDefault();
  try {
    let response;

    if (selectedType === "provider") {
      response = await loginProvider(email, password);
    } else {
      response = await loginUser(email, password);
    }

    
    if (response && response.status === 200) {
      const data = await response.json();
      const token = data.access; // Assuming the token is directly on the response object
      console.log("t", token);
      localStorage.setItem("jwtToken", token); // storing token in localStorage
      console.log("Login successful", response);

      // get stored wallet address(created when signup) from backend and store in cookie
      const singleWallet = await getWallet(token);
      console.log("singlewallet", singleWallet);
      if (singleWallet && singleWallet.length > 0 && singleWallet[0].address) {
        updateWalletAddress(singleWallet[0].address);
       } else {
        console.error("No wallet data found for the user.");
       }
      // console.log("single address", singleWallet[0].address);
      // updateWalletAddress(singleWallet[0].address);
      if (selectedType === "provider"&&singleWallet.length===0){
        console.log("create wallet working", createWallet)
        await createWallet(true);
       }
      
      
      setEmail("");
      setPassword("");
      dispatch(loginSuccess());
      // navigate("/clouds");
    } else {
      // Handle login failure, perhaps pop up an error message
      console.error("Login failed: ", response.message);
      alert("Login failed. Please check your credentials.");
    }
  } catch (error) {
    console.error("Login error", error);
    alert("Login failed. Please check your credentials.");
  }
};

  const connectWallet = async () => {
    if (typeof window != "undefined" && typeof window.ethereum != "undefined") {
      try {
        /* get provider */
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        /* get accounts */
        const accounts = await provider.send("eth_requestAccounts", []);
        /* set active wallet address */
        setMetaAddress(accounts[0]);
        /* get signer */
        updateWalletAddress(metaAddress);
        // updateWalletAddress(accounts[0]);
        setSigner(provider.getSigner());
        /* local contract instance */
        setFcContract(faucetContract(provider));
        console.log("connected", accounts[0]);
      } catch (err) {
        console.log("err", err.messgae);
        alert(err.message);
      }
    } else {
      /* MetaMask is not installed */
      console.log("Please install MetaMask");
      alert("Please install MetaMask");
    }
  };

  const handleWalletLogin = async (e) => {
    e.preventDefault();
    try {
      let response;

      if (selectedType === "provider") {
        response = await loginProvider(email, password);
      } else {
        response = await loginUser(email, password);
      }

      console.log("outside");
      console.log("Received response: ", response);

      if (response && response.status === 200) {
        const data = await response.json();
        const token = data.access; // Assuming the token is directly on the response object
        console.log(token);
        localStorage.setItem("jwtToken", token); // storing token in localStorage
        await connectWallet();
        console.log("Login successful", response);
        setEmail("");
        setPassword("");
        dispatch(loginSuccess());

        dispatch(hasExternalWallet());
        navigate("/clouds");
      } else {
        // Handle login failure, perhaps pop up an error message
        console.error("Login failed: ", response.message);
        alert("Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error", error);
      alert("Login failed. Please check your credentials.");
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="Alert">
      <div className="a-left">
        <img src={Logo} alt="" />
        <div className="Webname w-64">
          <h1>Huup AI</h1>
          <p className="text-xl">Explore your Market Cloud</p>
          <p className="text-sm">
            Green AI - Infrastructure for AI Democratization, Efficiency and
            Privacy{" "}
          </p>
          {/* console.log({FunWallet}) */}
        </div>
      </div>
      <div>
        {/* <h2>{isLogin ? "Login" : "Signup"}</h2> */}
        {isLogin ? (
          <LogIn
            onSignupClick={() => setIsLogin(false)}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            onLoginClick={handleLoginClick}
            showPassword={showPassword}
            toggleShowPassword={toggleShowPassword}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            connectWallet={handleWalletLogin}
            // onLogin={handleLogin}
          />
        ) : (
          <SignUp
            onLoginClick={() => setIsLogin(true)}
            createWallet={createWallet}
            navigate={navigate} // pass navigate function to SignUp component
            isChecked={isChecked}
            setIsChecked={setIsChecked}
            //{/*             SignUpLogin={handleLoginClick} */}
          />
        )}
      </div>
    </div>
  );
};

function LogIn({
  onSignupClick,
  // onLogin,
  email,
  setEmail,
  password,
  setPassword,
  onLoginClick,
  showPassword,
  toggleShowPassword,
  selectedType,
  setSelectedType,
  connectWallet,
}) {
  const [cookies, setCookie] = useCookies(["selectedType"]);
  
  const handleSelectChange = (e) => {
    e.preventDefault();
    const newValue = e.target.value;
    // setType(newValue);
    setSelectedType(newValue);
    setCookie("selectedType", newValue, { path: "/" });
  };

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Function to handle what happens after Google sign-in
  async function onSignIn(response) {
    const token_id = response.credential;
    try {
      const data = await googleSignIn(token_id);
      dispatch(loginSuccess(data.jwt_token));
      localStorage.setItem('jwtToken', data.jwt_token);
      navigate('/clouds');
    } catch (error) {
      console.error('Error:', error);
    }
  }

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: '857153619993-12tmpju7pdq3oqoqvhvkg2iv7dr2i5qs.apps.googleusercontent.com', 
        callback: onSignIn,
      });
      window.google.accounts.id.renderButton(
        document.getElementById('googleSignInButton'),
        { theme: 'outline', size: 'large' }
      );
      window.google.accounts.id.prompt();
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div>
      
      <form className="infoForm authForm">
        <div className="typeSelect rounded-t-xl " >
          <button
            onClick={handleSelectChange}
            value="customer"
            className={`px-6 py-3 mt-2 ${selectedType === "customer" ? "bg-white rounded-t-xl py-4" : "bg-gray-200 rounded-t-lg" }`}
          >
            Customer
          </button>
          <button
            onClick={handleSelectChange}
            value="provider"
            className={`px-6 py-3 mt-2 ${selectedType === "provider" ? "bg-white rounded-t-xl py-4" : "bg-gray-200 rounded-t-lg "}`}
          >
            Provider
          </button>
        </div>

        <div className="flex align-middle">
          <h3>Log In </h3>
        </div>

        <div className="px-4">
          <input
            type="email"
            placeholder="Email"
            className="infoInput"
            name="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="px-4">
          <input
            type={showPassword ? "text" : "password"}
            className="infoInput"
            placeholder="Password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {/* button for toggling password visibility */}
          <button
            type="button"
            onClick={toggleShowPassword}
            className="password-toggle-button"
          >
            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
          </button>
        </div>

        <div className="px-4">
          <p className="text-xs">
            Don't have an account?{" "}
            <span
              onClick={onSignupClick}
              style={{ cursor: "pointer", color: "blue" }}
            >
              Signup
            </span>
          </p>
        </div>

        <div id="googleSignInButton" className="google-button"></div>

        <div className="px-4">
          <p className="text-xs">
            {" "}
            If you are provider, please contact@huupai.xyz to obtain login
            access.
          </p>
        </div>
        <div className="px-4">
          <button
            className="button infoButton font-normal w-36"
            onClick={onLoginClick}
          >
            Login with Email
          </button>
          {selectedType === "customer" && (
            <button
              // onClick={""}
              onClick={connectWallet}
              className="button infoButton font-normal w-72"
            >
              Login with Email & Crypto Wallet
            </button>
          )}
        </div>
      </form>
    </div>
  );
}


function SignUp({
  onLoginClick,
  navigate,
  createWallet,
  isChecked,
  setIsChecked,
  SignUpLogin,
}) {
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    confirmpass: "",
    // walletAddress: "",
    is_provider: false,
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };
  const handleCheckboxChange = (event) => {
    setIsChecked(event.target.checked);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmpass) {
      alert("Passwords do not match!");
      return;
    }
    // console.log(formData);

    const dataToSend = {
      firstname: formData.firstname,
      lastname: formData.lastname,
      email: formData.email,
      password: formData.password,
      is_provider: formData.is_provider,
      company: formData.company,
      // walletAddress: formData.walletAddress,
      payment_method: formData.payment_method,
      card_number: formData.card_number,
      card_exp: formData.card_exp,
      card_name: formData.card_name,
      tax: formData.tax,
      role: formData.role,
    };

    const response = await registerUser(
      formData.email,
      formData.password,
      dataToSend
    );
    console.log(response);

    if (response.message === "User registered successfully") {
      alert(response.message);

      const loginResponse = await loginUser(formData.email, formData.password);

      if (loginResponse && loginResponse.status === 200) {
        // Handle successful login, e.g., store token, dispatch actions, etc.
        const data = await loginResponse.json();
        const token = data.access;
        localStorage.setItem("jwtToken", token);
        if (isChecked) {
          await createWallet(false); // create wallet
        }

        dispatch(loginSuccess());
        navigate("/clouds");
      } else {
        // Handle login failure after registration
        console.error("Auto-login failed after registration.");
      }

      alert(response.message);
    } else {
      alert("Registration failed!");
    }
  };

  return (
    <div>
      <form className="infoForm authForm md:p-4" onSubmit={handleSubmit}>
        <div>
          <h3 className="mt-4">Sign Up</h3>

          <div className="mb-4">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={handleCheckboxChange}
            />
            <span>Create a built-in wallet</span>
          </div>
        </div>

        <div>
          <input
            type="text"
            placeholder="First Name"
            className="infoInput"
            name="firstname"
            value={formData.firstname}
            onChange={handleChange}
          />

          <input
            type="text"
            placeholder="Last Name"
            className="infoInput"
            name="lastname"
            value={formData.lastname}
            onChange={handleChange}
          />
        </div>

        <div>
          <input
            type="email"
            className="infoInput"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div>
          <input
            type="password"
            className="infoInput"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
          />
          <input
            type="password"
            className="infoInput"
            name="confirmpass"
            placeholder="Confirm Password"
            value={formData.confirmpass}
            onChange={handleChange}
          />
        </div>

        <div>
          <p className="text-xs">
            Already have an account?{" "}
            <span
              onClick={onLoginClick}
              style={{ cursor: "pointer", color: "blue" }}
            >
              Login
            </span>
          </p>
        </div>
        <button
          onClick={SignUpLogin}
          className="button infoButton w-24"
          type="submit"
        >
          Signup
        </button>
      </form>
    </div>
  );
}

export default GoogleLogin;