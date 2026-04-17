import { Link } from 'react-router-dom';
import leftArrow from '../../assets/icons/shift.svg';

const About = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex items-center mb-6">
        <Link to={'/'}>
          <img
            src={leftArrow}
            alt="leftArrow"
            className="rotate-270 text-gray-600 hover:bg-gray-200 rounded-full p-2"
          />
        </Link>

        <h1 className="text-3xl font-bold text-orange-600 w-full text-center">
          About Mini-Reddit
        </h1>
      </div>
      <p className="text-lg text-gray-600 mb-8 leading-relaxed">
        This is a full-stack educational project built to demonstrate modern web
        development patterns. It focuses on high performance, clean
        architecture, and seamless user experience.
      </p>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-orange-600">
            Frontend
          </h2>
          <ul className="space-y-2 text-gray-700 font-medium">
            <li>• React & TypeScript</li>
            <li>• Zustand for State Management</li>
            <li>• Optimistic UI Updates</li>
            <li>• Tailwind CSS for Styling</li>
          </ul>
        </section>

        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-blue-600">Backend</h2>
          <ul className="space-y-2 text-gray-700 font-medium">
            <li>• Go (Golang)</li>
            <li>• PostgreSQL with Complex Transactions</li>
            <li>• Redis Invalidation Cache</li>
            <li>• RESTful API Design</li>
          </ul>
        </section>
      </div>

      <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
        <h2 className="text-2xl font-bold mb-4">The Goal</h2>
        <p className="text-gray-600 italic">
          "The main goal was to solve classic distributed systems problems, like
          data consistency in a voting system and efficient cache management."
        </p>
      </div>
    </div>
  );
};

export default About;
