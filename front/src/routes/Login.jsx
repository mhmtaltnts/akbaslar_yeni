import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials } from "../appStore/authSlice";
import { useLoginMutation } from "../api/authApiSlice";
import usePersist from "../utils/hooks/usePersist";
import useTitle from "../utils/hooks/useTitle";
import PulseLoader from "react-spinners/PulseLoader";

const Login = () => {
  useTitle("Kullanıcı Girişi");

  const userRef = useRef();
  const errRef = useRef();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [persist, setPersist] = usePersist();

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [login, { isLoading }] = useLoginMutation();

  useEffect(() => {
    userRef.current.focus();
  }, []);

  useEffect(() => {
    setErrMsg("");
  }, [username, password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { accessToken } = await login({ username, password }).unwrap();
      dispatch(setCredentials({ accessToken }));
      setUsername("");
      setPassword("");
      navigate("/dash");
    } catch (err) {
      if (!err.status) {
        setErrMsg("Server cevap vermiyor");
      } else if (err.status === 400) {
        setErrMsg("Kullanıcı adı ve şifre hatası");
      } else if (err.status === 401) {
        setErrMsg("Yetkiniz Yok");
      } else {
        setErrMsg(err.data?.message);
      }
      errRef.current.focus();
    }
  };

  const handleUserInput = (e) => setUsername(e.target.value);
  const handlePwdInput = (e) => setPassword(e.target.value);
  const handleToggle = () => setPersist((prev) => !prev);

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-screen">
        <PulseLoader color={"#FFF"} />
      </div>
    );

  return (
    <div className="flex flex-col items-center justify-center p-6 w-full max-w-lg ">
      {/* Error Message */}
      {errMsg && (
        <p
          ref={errRef}
          className="text-red-500 mb-4 text-lg"
          aria-live="assertive"
        >
          {errMsg}
        </p>
      )}

      {/* Login Form */}

      <h2 className="text-2xl font-bold text-center mb-4">Sisteme Giriş</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username Field */}
        <input
          type="text"
          id="username"
          ref={userRef}
          value={username}
          onChange={handleUserInput}
          autoComplete="off"
          placeholder="Kullanıcı Adı"
          required
          className="bg-amber-50 w-full p-3 border border-gray-400 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
        />

        {/* Password Field */}
        <input
          type="password"
          id="password"
          value={password}
          onChange={handlePwdInput}
          placeholder="Şifre"
          required
          className="bg-amber-50 w-full p-3 border border-gray-400 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
        />

        {/* Login Button */}
        <button
          type="submit"
          className="w-full bg-mavi hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition"
        >
          Giriş Yap
        </button>

        {/* Remember Me Checkbox */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <input
            type="checkbox"
            id="persist"
            onChange={handleToggle}
            checked={persist}
            className="w-5 h-5 accent-blue-500"
          />
          <label htmlFor="persist" className="text-gray-600 dark:text-gray-300">
            Şifremi Kaydet
          </label>
        </div>
      </form>
    </div>
  );
};

export default Login;
