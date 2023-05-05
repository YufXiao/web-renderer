import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import MeshRenderer from '../views/Mesh';
import PointCloudRenderer from "../views/PointCloud";
import Home from "../views/Home";


export default function AppRouter() {

    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home/>}/>
                    {/* <Route path="/mesh" element={<MeshRenderer/>}/>
                    <Route path="/point_cloud" element={<PointCloudRenderer/>}/> */}
            </Routes>
        </Router>
    )
}