import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/home/Home';
import About from './pages/about/About';
import MainLayout from './components/MainLayout';
import Post from './pages/post/Post';
import { Toaster } from 'react-hot-toast';
import ProfilePage from './pages/profilePage/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/r/:communityName" element={<Home />} />
          <Route path="/r/:communityName/:id" element={<Post />} />
          <Route path="/about" element={<About />} />
          <Route path="/u/:username" element={<ProfilePage />} />
          <Route element={<ProtectedRoute />}></Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
