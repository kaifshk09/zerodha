import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AuthContext from "./AuthContext";

const Menu = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [selectedMenu, setSelectedMenu] = useState(0);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const handleMenuClick = (index) => {
    setSelectedMenu(index);
  };

  const handleProfileClick = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const frontendUrl = process.env.REACT_APP_FRONTEND_URL;

  const redirectToFrontendHome = () => {
    const target = frontendUrl ? `${frontendUrl.replace(/\/+$/, "")}/` : "/";
    window.location.href = target;
  };

  const handleHome = () => {
    redirectToFrontendHome();
  };

  const handleLogout = () => {
    logout();
    redirectToFrontendHome();
  };

  const menuClass = "menu";
  const activeMenuClass = "menu selected";

  return (
    <div className="menu-container">
      <img src="logo.png" alt="Zerodha logo" style={{ width: "50px" }} />
      <div className="menus">
        <ul>
          <li>
            <Link
              style={{ textDecoration: "none" }}
              to="/"
              onClick={() => handleMenuClick(0)}
            >
              <p className={selectedMenu === 0 ? activeMenuClass : menuClass}>
                Dashboard
              </p>
            </Link>
          </li>
          <li>
            <Link
              style={{ textDecoration: "none" }}
              to="/orders"
              onClick={() => handleMenuClick(1)}
            >
              <p className={selectedMenu === 1 ? activeMenuClass : menuClass}>
                Orders
              </p>
            </Link>
          </li>
          <li>
            <Link
              style={{ textDecoration: "none" }}
              to="/holdings"
              onClick={() => handleMenuClick(2)}
            >
              <p className={selectedMenu === 2 ? activeMenuClass : menuClass}>
                Holdings
              </p>
            </Link>
          </li>
          <li>
            <Link
              style={{ textDecoration: "none" }}
              to="/positions"
              onClick={() => handleMenuClick(3)}
            >
              <p className={selectedMenu === 3 ? activeMenuClass : menuClass}>
                Positions
              </p>
            </Link>
          </li>
          <li>
            <Link
              style={{ textDecoration: "none" }}
              to="funds"
              onClick={() => handleMenuClick(4)}
            >
              <p className={selectedMenu === 4 ? activeMenuClass : menuClass}>
                Funds
              </p>
            </Link>
          </li>
          <li>
            <Link
              style={{ textDecoration: "none" }}
              to="/apps"
              onClick={() => handleMenuClick(6)}
            >
              <p className={selectedMenu === 6 ? activeMenuClass : menuClass}>
                Apps
              </p>
            </Link>
          </li>
        </ul>
        <hr />
        <div className="profile" onClick={handleProfileClick}>
          <div className="avatar">{user?.email?.[0]?.toUpperCase() || "U"}</div>
          <div className="profileInfo">
            <p className="username">{user?.email || "Guest"}</p>
            <span className="profileActions">
              <button
                type="button"
                className="btn btn-grey"
                onClick={(e) => {
                  e.stopPropagation();
                  handleHome();
                }}
              >
                Home
              </button>
              <button
                type="button"
                className="btn btn-grey"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
              >
                Logout
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
