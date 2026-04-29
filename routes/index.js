import authRoutes        from './auth_routes.js';
import donorRoutes       from './donor_routes.js';
import distributorRoutes from './distributor_routes.js';
import adminRoutes       from './admin_routes.js';
import volunteerRoutes   from './volunteer_routes.js';
import chatRoutes        from './chat_routes.js';

const constructorMethod = (app) => {
  app.use('/', authRoutes);
  app.use('/', donorRoutes);
  app.use('/', distributorRoutes);
  app.use('/', adminRoutes);
  app.use('/', volunteerRoutes);
  app.use('/', chatRoutes);

  app.use(/(.*)/, (req, res) => {
    return res.status(404).render('error', {
      pageTitle: 'Not Found',
      user: req.session.user || null,
      error: 'page not found',
    });
  });
};

export default constructorMethod;