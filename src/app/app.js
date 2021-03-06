import angular from 'angular';

import "jsonwebtoken";
import jwt from "jsonwebtoken";

import "../style/main.css"

const MODULE_NAME = 'app';

const module = angular.module(MODULE_NAME, [])
  .config(($httpProvider) => {
    $httpProvider.interceptors.push('authorizationHeaderInterceptor');
  });

module.component('home', {
  template: require('./home.html'),
  controller: function (authenticationService) {
    let that = this;

    authenticationService.isAuthenticated().then((res) => that.authenticated = res);

    that.logout = () => {
      authenticationService.logout()
        .then(() => that.authenticated = false);
    }
  }
});

module.component('categories', {
  template: require('./categories.html'),
  controller: function ($http, authenticationService) {
    let that = this;

    that.toAdd = {};

    that.errorOccured = (msg) => {
      that.error = true;
      that.errorMessage = msg;
    };

    that.clearError = () => {
      that.error = false;
    };

    that.hasEditPermission = (category) => {
      const userId = authenticationService.getUserId();
      const role = authenticationService.getRole();

      return (userId == category.userId) || (role === 'ADMIN');
    };

    that.refetch = () => $http.get('/forests').then(response => {
      that.categories = response.data;
      that.categories.sort((a, b) => a.id - b.id);
    });

    that.refetch();

    that.show = (category) => {
      if (that.chosenCategory !== category)
        that.chosenCategory = category;
      else
        that.chosenCategory = undefined;
    };

    that.add = () => {
      $http.post('/forests', that.toAdd).then(() => {
        that.toAdd = {};
        that.refetch();
      }).catch(err => that.errorOccured(err.data.message));
    };

    that.editMode = (forest) => {
      forest.toEdit = angular.copy(forest);
      forest.editMode = true;
      forest.toEdit.id = undefined;
      forest.toEdit.editMode = undefined;
      forest.toEdit.elves = undefined;
    };

    that.edit = (forest) => {
      forest.toEdit.userId = undefined;
      $http.put('/forests/' + forest.id, forest.toEdit).then(() => {
        forest.editMode = false;
        that.refetch();
      }).catch(err => that.errorOccured(err.data.message));
    };

    that.delete = (forest) => {
      $http.delete('/forests/' + forest.id).then(() => {
        that.refetch();
      }).catch(err => that.errorOccured(err.data.message));
    };
  }
});

module.component('elements', {
  template: require('./elements.html'),
  bindings: {
    category: '<'
  },
  controller: function ($http, authenticationService) {
    let that = this;

    that.bowTypes = ['SMALL', 'BIG'];
    that.powerTypes = ['SPEED', 'STRENGHT'];

    that.$onChanges = function (changes) {
      that.refetch();
    };

    that.errorOccured = (msg) => {
      that.error = true;
      that.errorMessage = msg;
    };

    that.clearError = () => {
      that.error = false;
    };

    that.refetch = () => {
      $http.get('/elves').then(response => {
        that.elves = response.data.filter(elf => elf.forestId === that.category.id);
        that.elves.sort((a, b) => a.id - b.id);
        that.toAdd = { forestId: that.category.id };
        that.clearError();
      });
    };

    that.editMode = (elf) => {
      elf.toEdit = angular.copy(elf);
      elf.editMode = true;
      elf.toEdit.id = undefined;
      elf.toEdit.editMode = undefined;
    };

    that.hasEditPermission = () => {
      const userId = authenticationService.getUserId();
      const role = authenticationService.getRole();

      return (userId == that.category.userId) || (role === 'ADMIN');
    };

    that.edit = (elf) => {
      $http.put('/elves/' + elf.id, elf.toEdit).then(() => {
        elf.editMode = false;
        that.refetch();
      }).catch(err => that.errorOccured(err.data.message));
    };

    that.add = () => {
      $http.post('/elves', that.toAdd).then(() => {
        that.refetch();
      }).catch(err => that.errorOccured(err.data.message));
    };

    that.delete = (elf) => {
      $http.delete('/elves/' + elf.id).then(() => {
        that.refetch();
      }).catch(err => that.errorOccured(err.data.message));
    };
  }
});

class LoginComponent {
  constructor (authenticationService) {
    this.authenticationService = authenticationService;
    this.username = '';
    this.password = '';
  }

  login() {
    this.authenticationService.loginWith(this.username, this.password)
      .then(response => {
        if (response.status === 200) {
          this.authenticated = true;
        } else {
          this.error = true;
          this.errorMessage = response.data.message;
        }
      });
  }
}

module.component('login', {
  template: require('./login..html'),
  bindings: {
    authenticated: '='
  },
  controller: LoginComponent
});

module.service('tokenService', function () {
  let that = this;

  that.setToken = (token) => sessionStorage.setItem('token', token);

  that.getToken = () => sessionStorage.getItem('token');
});

class AuthenticationService {

  constructor($http, tokenService) {
    this.http = $http;
    this.tokenService = tokenService;

    const token = sessionStorage.getItem('token');
    if (token != null)
      this.authenticatedWith(token);
  }

  loginWith(username, password) {
    return this.http.post('/auth/login', { username, password })
      .then(response => {
        this.authenticatedWith(response.headers('Authorization'));
        return response;
      })
      .catch(response => {
        return response;
      });
  }

  authenticatedWith(token) {
    this.tokenService.setToken(token);
    const decoded = jwt.decode(token);
    sessionStorage.setItem('userId', decoded.userId);
    sessionStorage.setItem('role', decoded.role);
  }

  logout() {
    return this.http.delete('/auth/logout')
      .then(response => {
        sessionStorage.clear();
      });
  }

  isAuthenticated() {
    return this.http.get("/auth/test")
      .then(() => true)
      .catch(() => {
        sessionStorage.clear();
        return false;
      });
  }

  getUserId() {
    return sessionStorage.getItem('userId');
  }

  getRole() {
    return sessionStorage.getItem('role');
  }
}

module.service('authenticationService', AuthenticationService);

module.factory('authorizationHeaderInterceptor',
  (tokenService) => ({
    request: (config) => {
      const token = tokenService.getToken();

      if (token)
        config.headers['Authorization'] = token;

      return config;
    }
  })
);

class UserService {
  constructor($http) {
    this.http = $http;
  }

  getAll() {
    return this.http.get('/users');
  }

  getById(userId) {
    return this.http.get(`/users/${id}`);
  }

  update(user) {
    return this.http.put(`/users/${user.id}`,
      {
        username: user.username,
        password: user.password,
        role: user.role
      });
  }
}

module.service('userService', UserService);

class UsersComponent {
  constructor(userService, authenticationService) {
    this.userService = userService;
    this.role = authenticationService.getRole();
    this.userId = authenticationService.getUserId();
    this.refetch();
  }

  refetch() {
    this.userService.getAll().then(resp => {
      if (this.role === 'USER') {
        this.users = resp.data.filter(user => user.id == this.userId);
      } else {
        this.users = resp.data;
      }

      this.users.forEach(user => {
        user.toEdit = angular.copy(user);
        delete user.toEdit.forests;
        user.toEdit.password = '';
        console.log(user.toEdit);
      });
    });
  }

  update(user) {
    this.userService.update(user.toEdit)
      .then(() => user.toEdit.edited = true);
  }
}

module.component('usersComponent', {
  template: require('./users.html'),
  controller: UsersComponent
});

class HighScoresComponent {
  constructor($http) {
    this.http = $http;
    this.refetch();
  }

  refetch() {
    this.http.get('/elves?highScores=true')
      .then((response) => this.elves = response.data);
  }
}

module.component('highScores', {
  template: require('./high-scores.html'),
  controller: HighScoresComponent
});

export default MODULE_NAME;
