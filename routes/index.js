import authRoutes from './auth_routes.js';
import donorRoutes from './donor_routes.js';

const constructorMethod = (app) => {
  app.use('/', authRoutes);
  app.use('/', donorRoutes);

  // catching anything that didn't match a route above
  app.use(/(.*)/, (req, res) => {
    return res.status(404).render('error', {
      pageTitle: 'Not Found',
      user: req.session.user || null,
      error: 'page not found',
    });
  });
};

export default constructorMethod;