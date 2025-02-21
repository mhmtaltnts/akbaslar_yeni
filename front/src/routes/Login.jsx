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
      <div className="flex h-screen items-center justify-center">
        <PulseLoader color={"#FFF"} />
      </div>
    );

  return (
    <div className="flex w-full max-w-lg flex-col items-center justify-center p-6">
      {/* Error Message */}
      {errMsg && (
        <p
          ref={errRef}
          className="mb-4 text-lg text-red-500"
          aria-live="assertive"
        >
          {errMsg}
        </p>
      )}

      {/* Login Form */}

      <h2 className="mb-4 text-center text-xl font-bold md:text-2xl">
        Sisteme Giriş
      </h2>

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
          className="w-full rounded-lg border border-gray-400 bg-amber-50 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
        />

        {/* Password Field */}
        <input
          type="password"
          id="password"
          value={password}
          onChange={handlePwdInput}
          placeholder="Şifre"
          required
          className="w-full rounded-lg border border-gray-400 bg-amber-50 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
        />

        {/* Login Button */}
        <button
          type="submit"
          className="bg-mavi w-full rounded-lg py-2 font-semibold text-white transition hover:bg-blue-600"
        >
          Giriş Yap
        </button>

        {/* Remember Me Checkbox */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <input
            type="checkbox"
            id="persist"
            onChange={handleToggle}
            checked={persist}
            className="h-5 w-5 accent-blue-500"
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
