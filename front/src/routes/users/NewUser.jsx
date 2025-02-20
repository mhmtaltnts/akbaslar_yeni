import { useState, useEffect } from "react";
import { useAddNewUserMutation } from "../../api/usersApiSlice";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave } from "@fortawesome/free-solid-svg-icons";
import { ROLES } from "../../utils/config/roles";
import useTitle from "../../utils/hooks/useTitle";
import Title from "../../components/title";

const NewUser = () => {
  useTitle("Yeni Kullanıcı");

  const [addNewUser, { isLoading, isSuccess, isError, error }] =
    useAddNewUserMutation();

  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState(["Çalışan"]);

  useEffect(() => {
    if (isSuccess) {
      setFullName("");
      setUsername("");
      setPassword("");
      setRoles([]);
      navigate("/dash/users");
    }
  }, [isSuccess, navigate]);

  const onFullNameChanged = (e) => setFullName(e.target.value);
  const onUsernameChanged = (e) => setUsername(e.target.value);
  const onPasswordChanged = (e) => setPassword(e.target.value);

  const onRolesChanged = (e) => {
    const values = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    setRoles(values);
  };

  const canSave = !isLoading;

  const onSaveUserClicked = async (e) => {
    e.preventDefault();
    if (canSave) {
      await addNewUser({ fullName, username, password, roles });
    }
  };

  const options = Object.values(ROLES).map((role) => {
    return (
      <option key={role} value={role}>
        {role}
      </option>
    );
  });

  const errClass = isError
    ? "text-red-500 dark:text-red-400 text-sm"
    : "hidden";

  const validRolesClass = !roles.length ? "border-red-500" : "";

  const content = (
    <div className="w-full max-w-lg mx-auto  p-6">
      <p className={errClass}>{error?.data?.message}</p>
      <Title>Yeni Kullanıcı</Title>
      <form
        onSubmit={onSaveUserClicked}
        autoComplete="off"
        className="space-y-4"
      >
        {/* Full Name */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="fullname"
          >
            Adı ve Soyadı:
          </label>
          <input
            className="bg-amber-50 mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            id="fullname"
            name="fullname"
            type="text"
            autoComplete="off"
            value={fullName}
            placeholder="Adı ve Soyadı"
            onChange={onFullNameChanged}
            autoFocus
          />
        </div>

        {/* Username */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="username"
          >
            Kullanıcı Adı:
          </label>
          <input
            className="bg-amber-50 mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            id="username"
            name="username"
            type="text"
            autoComplete="off"
            value={username}
            placeholder="Kullanıcı Adı"
            onChange={onUsernameChanged}
          />
        </div>

        {/* Password */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="password"
          >
            Şifre:
          </label>
          <input
            className="bg-amber-50 mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            id="password"
            name="password"
            type="password"
            autoComplete="off"
            value={password}
            placeholder="Şifre"
            onChange={onPasswordChanged}
          />
        </div>

        {/* Roles */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="roles"
          >
            Rolleri:
          </label>
          <select
            id="roles"
            name="roles"
            className={`bg-amber-50 mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${validRolesClass}`}
            multiple={true}
            size="4"
            value={roles}
            onChange={onRolesChanged}
          >
            {options}
          </select>
        </div>
        <div className="flex justify-between items-center mb-6 ">
          <button
            className="w-full p-2 bg-yesil text-white rounded hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
            title="Kaydet"
            disabled={!canSave}
          >
            <FontAwesomeIcon icon={faSave} /> Kaydet
          </button>
        </div>
      </form>
    </div>
  );

  return content;
};

export default NewUser;
