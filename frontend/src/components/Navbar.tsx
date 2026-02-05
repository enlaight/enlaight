import { Link } from 'react-router-dom';
import { SearchBar } from './SearchBar';
import { UserControls } from './UserControls';

export const Navbar: React.FC = () => {
  return (
    <header className="relative top-0 left-0 right-0 flex w-full h-16 flex-col justify-center items-center shrink-0 bg-navbar px-4 py-6 border-b-navbar-foreground border-b border-none z-20">
      <div className="flex justify-between items-center self-stretch relative p-0 gap-4">
        <Link to="/" className="flex-shrink-0 cursor-pointer">
          <svg
            width="184"
            height="30"
            viewBox="0 0 184 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="logo max-sm:w-[140px] max-sm:h-[24px]"
            aria-label="Company logo"
            id="Enlaight Logo"
          >
            <path d="M17.7754 26.1154L24.8852 30.2147V26.1154L21.3237 24.0625L17.7754 26.1154Z" fill="#2D2D2E" />
            <path d="M14.1934 19.9567L7.11639 15.8836L24.8844 5.5993L24.8516 1.5L0 15.8836L10.6451 22.0096L14.1934 19.9567Z" fill="#2D2D2E" />
            <path d="M21.3546 9.69824L17.8062 11.7512L24.8832 15.8308L7.11523 26.1151L7.14147 30.2144L31.9996 15.8308L21.3546 9.69824Z" fill="white" />
            <path d="M14.2185 5.59274L7.11523 1.5V5.5993L10.6701 7.64567L14.2185 5.59274Z" fill="white" />
            <path d="M71.9862 9.1416V18.696L61.5703 9.1416V23.4276H63.724V13.8666L74.1399 23.4276V9.1416H71.9862Z" fill="#2D2D2E" />
            <path d="M46.1537 11.1647H54.4746V9.1416H46.1537H44V11.1647V15.2697V17.2994V21.3979V23.4276H46.1537H54.4746V21.3979H46.1537V17.2994H54.4746V15.2697H46.1537V14.7281V11.1647Z" fill="#2D2D2E" />
            <path d="M125.435 9.1416V23.4276H123.281V9.1416H125.435Z" fill="white" />
            <path d="M140.583 15.9411H146.483V16.411C146.483 17.4813 146.359 18.4341 146.105 19.263C145.857 20.0265 145.439 20.7444 144.858 21.4101C143.533 22.9046 141.843 23.6486 139.8 23.6486C137.757 23.6486 136.087 22.9242 134.664 21.4819C133.241 20.0331 132.523 18.2906 132.523 16.2609C132.523 14.2312 133.248 12.43 134.697 10.9877C136.146 9.53887 137.908 8.81445 139.989 8.81445C141.105 8.81445 142.15 9.04287 143.116 9.49971C144.042 9.95655 144.949 10.694 145.844 11.7186L144.31 13.187C143.142 11.6273 141.712 10.8441 140.029 10.8441C138.521 10.8441 137.248 11.3662 136.224 12.4104C135.199 13.435 134.69 14.7142 134.69 16.2609C134.69 17.8076 135.258 19.1651 136.4 20.1962C137.47 21.1491 138.625 21.632 139.872 21.632C140.936 21.632 141.882 21.2731 142.73 20.5617C143.572 19.8373 144.049 18.9758 144.147 17.9708H140.583V15.9476V15.9411Z" fill="#2D2D2E" />
            <path d="M113.701 23.4272L107.507 12.6654L101.281 23.4272L98.7949 23.4076L107.507 8.35156L116.187 23.4272H113.701Z" fill="white" />
            <path d="M83.3868 9.1416V21.3979H91.7012V23.421H81.2266V9.1416H83.3802H83.3868Z" fill="#2D2D2E" />
            <path d="M163.367 9.1416V15.2697H155.105V9.1416H152.951V23.4276H155.105V17.2994H163.367V23.4276H165.521V9.1416H163.367Z" fill="#2D2D2E" />
            <path d="M178.931 11.1647V23.4276H176.777V11.1647H172.613V9.1416H183.088V11.1647H178.937H178.931Z" fill="#2D2D2E" />
          </svg>
        </Link>

        <div className="hidden md:flex flex-1 justify-center max-w-2xl mx-auto">
          <SearchBar />
        </div>

        <div className="flex items-center gap-3">
          <div className="md:hidden">
            <SearchBar />
          </div>
          <UserControls />
        </div>
      </div>
    </header>
  );
};
