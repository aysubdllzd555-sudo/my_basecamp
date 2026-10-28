(function () {
  'use strict';

  var state = { me: null, ready: false, tab: 'all', projects: [], ticket: 0 };

  var pages = {};
  document.querySelectorAll('.page').forEach(function (el) {
    pages[el.getAttribute('data-page')] = el;
  });

  Object.keys(pages).forEach(function (key) {
    pages[key].hidden = true;
  });

  var navEl = document.getElementById('nav');
  var projectsList = document.getElementById('projects-list');
  var usersList = document.getElementById('users-list');
  var confirmDialog = document.getElementById('confirm');
  var toastBox = document.getElementById('toasts');

  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initial(name) {
    var trimmed = String(name || '?').trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
  }

  function notify(text, kind) {
    var el = document.createElement('div');
    el.className = 'toast ' + (kind === 'error' ? 'is-error' : 'is-ok');
    el.textContent = text;
    toastBox.appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 3200);
  }

  function request(method, url, body) {
    var options = { method: method, credentials: 'same-origin', headers: {} };
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    return fetch(url, options).then(
      function (res) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            if (!res.ok) {
              var err = new Error(data.error || 'Action failed.');
              err.status = res.status;
              throw err;
            }
            return data;
          });
      },
      function () {
        throw new Error('Cannot reach the server. Is it running?');
      }
    );
  }

  function go(hash) {
    if (location.hash === hash) {
      route();
    } else {
      location.hash = hash;
    }
  }

  function sessionLost() {
    state.me = null;
    state.projects = [];
    renderNav();
    notify('Session expired. Please sign in again.', 'error');
    go('#/signin');
  }

  function handleFailure(err) {
    if (err && err.status === 401 && state.me) {
      sessionLost();
      return;
    }
    notify(err && err.message ? err.message : 'Something went wrong.', 'error');
  }

  function renderNav() {
    var hash = location.hash || '#/';
    if (!state.me) {
      navEl.innerHTML = '';
      return;
    }
    var inProjects = hash.indexOf('#/projects') === 0;
    var inUsers = hash.indexOf('#/users') === 0;
    navEl.innerHTML =
      '<a class="nav-link' + (inProjects ? ' is-current' : '') + '" href="#/projects">Projects</a>' +
      '<a class="nav-link' + (inUsers ? ' is-current' : '') + '" href="#/users">Users</a>' +
      '<a class="nav-who" href="#/users/' + state.me.id + '">' +
      esc(state.me.name) + (state.me.isAdmin ? ' · Admin' : '') + '</a>' +
      '<button class="btn btn-ghost btn-sm" data-action="signout">Sign out</button>';
  }

  function show(name) {
    Object.keys(pages).forEach(function (key) {
      pages[key].classList.toggle('is-active', key === name);
      pages[key].hidden = key !== name;
    });
    document.body.setAttribute('data-view', name);
    window.scrollTo(0, 0);
  }

  function clearErrors(form) {
    var box = form.querySelector('[data-error]');
    if (box) box.textContent = '';
  }

  function showError(form, message) {
    var box = form.querySelector('[data-error]');
    if (box) box.textContent = message;
  }

  function skeletons(count) {
    var out = '';
    for (var i = 0; i < count; i++) out += '<div class="skeleton"></div>';
    return out;
  }

  function askConfirm(title, text, okLabel) {
    return new Promise(function (resolve) {
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-text').textContent = text;
      document.getElementById('confirm-ok').textContent = okLabel || 'Delete';
      var done = function () {
        confirmDialog.removeEventListener('close', done);
        resolve(confirmDialog.returnValue === 'ok');
      };
      confirmDialog.returnValue = 'cancel';
      confirmDialog.addEventListener('close', done);
      if (typeof confirmDialog.showModal === 'function') {
        confirmDialog.showModal();
      } else {
        confirmDialog.removeEventListener('close', done);
        resolve(window.confirm(text));
      }
    });
  }

  function canManageProject(project) {
    return !!state.me && (state.me.isAdmin || state.me.id === project.user_id);
  }

  function projectCard(project) {
    var desc = project.description
      ? '<div class="card-body">' + esc(project.description) + '</div>'
      : '<div class="card-body is-empty">No description</div>';
    var foot = '<a class="btn btn-ghost btn-sm" href="#/projects/' + project.id + '">View</a>';
    if (canManageProject(project)) {
      foot +=
        '<a class="btn btn-ghost btn-sm" href="#/projects/' + project.id + '/edit">Edit</a>' +
        '<button class="btn btn-soft-danger btn-sm" data-action="delete-project" data-id="' + project.id + '">Delete</button>';
    }
    return (
      '<div class="card">' +
      '<a class="card-head" href="#/projects/' + project.id + '">' +
      '<h3 class="card-title">' + esc(project.title) + '</h3>' +
      '<p class="card-owner">' + esc(project.owner_name) + '</p>' +
      '</a>' + desc +
      '<div class="card-foot">' + foot + '</div>' +
      '</div>'
    );
  }

  function renderProjects() {
    var list = state.projects;
    if (state.tab === 'mine') {
      list = list.filter(function (p) {
        return p.user_id === state.me.id;
      });
    }
    if (!list.length) {
      projectsList.innerHTML =
        '<div class="empty"><h3>' +
        (state.tab === 'mine' ? 'You have no projects yet' : 'No projects yet') +
        '</h3><p>Create your first project to get started.</p>' +
        '<a class="btn btn-primary" href="#/projects/new">+ New project</a></div>';
      return;
    }
    projectsList.innerHTML = list.map(projectCard).join('');
  }

  function syncTabs() {
    document.querySelectorAll('#project-tabs .tab').forEach(function (tab) {
      tab.classList.toggle('is-active', tab.getAttribute('data-tab') === state.tab);
    });
  }

  function openProjects() {
    var ticket = ++state.ticket;
    show('projects');
    syncTabs();
    projectsList.innerHTML = skeletons(3);
    request('GET', '/api/projects').then(
      function (data) {
        if (ticket !== state.ticket) return;
        state.projects = data;
        renderProjects();
      },
      function (err) {
        if (ticket !== state.ticket) return;
        projectsList.innerHTML = '<div class="empty"><h3>Could not load</h3><p>' + esc(err.message) + '</p></div>';
        handleFailure(err);
      }
    );
  }

  function openProject(id) {
    var ticket = ++state.ticket;
    var box = document.getElementById('project-detail');
    show('project');
    box.innerHTML = '<div class="skeleton skeleton-tall"></div>';
    request('GET', '/api/projects/' + id).then(
      function (p) {
        if (ticket !== state.ticket) return;
        var foot = '';
        if (canManageProject(p)) {
          foot =
            '<div class="detail-foot">' +
            '<a class="btn btn-primary btn-sm" href="#/projects/' + p.id + '/edit">Edit</a>' +
            '<button class="btn btn-soft-danger btn-sm" data-action="delete-project" data-id="' + p.id + '" data-back="1">Delete</button>' +
            '</div>';
        }
        var created = p.created_at ? '<p class="detail-meta">Created: ' + esc(String(p.created_at).slice(0, 10)) + '</p>' : '';
        box.innerHTML =
          '<div class="detail-head"><h2>' + esc(p.title) + '</h2><p>' + esc(p.owner_name) + '</p></div>' +
          '<div class="detail-body">' +
          (p.description
            ? '<p class="detail-text">' + esc(p.description) + '</p>'
            : '<p class="detail-text is-empty">No description.</p>') +
          created + '</div>' + foot;
      },
      function (err) {
        if (ticket !== state.ticket) return;
        box.innerHTML =
          '<div class="detail-body"><h2>Project not found</h2><p class="detail-text is-empty">' + esc(err.message) + '</p></div>';
        if (err.status === 401) handleFailure(err);
      }
    );
  }

  function openProjectForm(id) {
    var ticket = ++state.ticket;
    var form = document.getElementById('project-form');
    var title = document.getElementById('project-form-title');
    var sub = document.getElementById('project-form-sub');
    var submit = document.getElementById('project-submit');
    show('project-form');
    form.reset();
    clearErrors(form);
    form.setAttribute('data-id', id || '');
    if (!id) {
      title.textContent = 'New project';
      sub.textContent = 'Enter the project title and description';
      submit.textContent = 'Create project';
      form.elements.title.focus();
      return;
    }
    title.textContent = 'Edit project';
    sub.textContent = 'Change the details and save';
    submit.textContent = 'Save changes';
    submit.disabled = true;
    request('GET', '/api/projects/' + id).then(
      function (p) {
        if (ticket !== state.ticket) return;
        if (!canManageProject(p)) {
          notify('You are not allowed to edit this project.', 'error');
          go('#/projects');
          return;
        }
        form.elements.title.value = p.title;
        form.elements.description.value = p.description || '';
        submit.disabled = false;
        form.elements.title.focus();
      },
      function (err) {
        if (ticket !== state.ticket) return;
        handleFailure(err);
        go('#/projects');
      }
    );
  }

  function userCard(user) {
    var chips = '<span class="chip ' + (user.is_admin ? 'chip-admin' : '') + '">' + (user.is_admin ? 'Admin' : 'User') + '</span>';
    if (state.me.id === user.id) chips += '<span class="chip chip-me">You</span>';
    return (
      '<div class="card user-card">' +
      '<div class="avatar">' + esc(initial(user.name)) + '</div>' +
      '<div class="user-name">' + esc(user.name) + '</div>' +
      '<div class="chips">' + chips + '</div>' +
      '<div class="card-foot"><a class="btn btn-ghost btn-sm" href="#/users/' + user.id + '">View</a></div>' +
      '</div>'
    );
  }

  function openUsers() {
    var ticket = ++state.ticket;
    show('users');
    usersList.innerHTML = skeletons(4);
    request('GET', '/api/users').then(
      function (data) {
        if (ticket !== state.ticket) return;
        usersList.innerHTML = data.map(userCard).join('');
      },
      function (err) {
        if (ticket !== state.ticket) return;
        usersList.innerHTML = '<div class="empty"><h3>Could not load</h3><p>' + esc(err.message) + '</p></div>';
        handleFailure(err);
      }
    );
  }

  function openUser(id) {
    var ticket = ++state.ticket;
    var box = document.getElementById('user-detail');
    show('user');
    box.innerHTML = '<div class="skeleton skeleton-tall"></div>';
    request('GET', '/api/users/' + id).then(
      function (u) {
        if (ticket !== state.ticket) return;
        var self = state.me.id === u.id;
        var actions = '';
        if (state.me.isAdmin) {
          actions += u.is_admin
            ? '<button class="btn btn-amber btn-sm" data-action="remove-admin" data-id="' + u.id + '">Remove admin</button>'
            : '<button class="btn btn-primary btn-sm" data-action="set-admin" data-id="' + u.id + '">Make admin</button>';
        }
        if (self || state.me.isAdmin) {
          actions +=
            '<button class="btn btn-soft-danger btn-sm" data-action="delete-user" data-id="' + u.id + '">' +
            (self ? 'Delete my account' : 'Delete user') + '</button>';
        }
        box.innerHTML =
          '<div class="detail-body">' +
          '<div class="avatar">' + esc(initial(u.name)) + '</div>' +
          '<h2>' + esc(u.name) + '</h2>' +
          '<p class="detail-email">' + esc(u.email) + '</p>' +
          '<div class="chips"><span class="chip ' + (u.is_admin ? 'chip-admin' : '') + '">' + (u.is_admin ? 'Admin' : 'User') + '</span>' +
          (self ? '<span class="chip chip-me">You</span>' : '') + '</div>' +
          '</div>' +
          (actions ? '<div class="detail-foot">' + actions + '</div>' : '');
      },
      function (err) {
        if (ticket !== state.ticket) return;
        box.innerHTML =
          '<div class="detail-body"><h2>User not found</h2><p class="detail-email">' + esc(err.message) + '</p></div>';
        if (err.status === 401) handleFailure(err);
      }
    );
  }

  function route() {
    if (!state.ready) return;
    state.ticket++;
    var hash = location.hash || '#/';
    var parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    var head = parts[0] || '';
    var open = ['', 'signin', 'signup'].indexOf(head) !== -1 && parts.length <= 1;

    if (!state.me && !open) return go('#/signin');
    if (state.me && open) return go('#/projects');

    renderNav();

    if (!head) {
      show('home');
    } else if (head === 'signin' && parts.length === 1) {
      show('signin');
      var f1 = document.getElementById('signin-form');
      clearErrors(f1);
      f1.elements.email.focus();
    } else if (head === 'signup' && parts.length === 1) {
      show('signup');
      var f2 = document.getElementById('signup-form');
      clearErrors(f2);
      f2.elements.name.focus();
    } else if (head === 'projects' && parts.length === 1) {
      openProjects();
    } else if (head === 'projects' && parts[1] === 'new' && parts.length === 2) {
      openProjectForm(null);
    } else if (head === 'projects' && /^\d+$/.test(parts[1] || '') && parts.length === 2) {
      openProject(parts[1]);
    } else if (head === 'projects' && /^\d+$/.test(parts[1] || '') && parts[2] === 'edit' && parts.length === 3) {
      openProjectForm(parts[1]);
    } else if (head === 'users' && parts.length === 1) {
      openUsers();
    } else if (head === 'users' && /^\d+$/.test(parts[1] || '') && parts.length === 2) {
      openUser(parts[1]);
    } else {
      show('missing');
    }
  }

  function loadMe() {
    return request('GET', '/api/current_user').then(function (data) {
      state.me = data.loggedIn
        ? { id: data.id, name: data.name || data.email, email: data.email, isAdmin: !!data.isAdmin }
        : null;
    });
  }

  function lock(form, locked) {
    var btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = locked;
  }

  document.getElementById('signin-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.currentTarget;
    var email = form.elements.email.value.trim();
    var password = form.elements.password.value;
    clearErrors(form);
    if (!email || !password) return showError(form, 'Enter your email and password.');
    lock(form, true);
    request('POST', '/api/signin', { email: email, password: password })
      .then(loadMe)
      .then(function () {
        form.reset();
        notify('Welcome, ' + state.me.name + '!');
        go('#/projects');
      })
      .catch(function (err) {
        showError(form, err.message);
      })
      .then(function () {
        lock(form, false);
      });
  });

  document.getElementById('signup-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.currentTarget;
    var name = form.elements.name.value.trim();
    var email = form.elements.email.value.trim();
    var password = form.elements.password.value;
    var confirmation = form.elements.password_confirmation.value;
    clearErrors(form);
    if (!name || !email || !password || !confirmation) return showError(form, 'Please fill in all fields.');
    if (password.length < 6) return showError(form, 'Password must be at least 6 characters.');
    if (password !== confirmation) return showError(form, 'Passwords do not match.');
    lock(form, true);
    request('POST', '/api/signup', { name: name, email: email, password: password, password_confirmation: confirmation })
      .then(function () {
        return request('POST', '/api/signin', { email: email, password: password });
      })
      .then(loadMe)
      .then(function () {
        form.reset();
        notify('Account created. Welcome!');
        go('#/projects');
      })
      .catch(function (err) {
        showError(form, err.message);
      })
      .then(function () {
        lock(form, false);
      });
  });

  document.getElementById('project-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.currentTarget;
    var id = form.getAttribute('data-id');
    var title = form.elements.title.value.trim();
    var description = form.elements.description.value.trim();
    clearErrors(form);
    if (!title) return showError(form, 'Enter the project title.');
    lock(form, true);
    var call = id
      ? request('PUT', '/api/projects/' + id, { title: title, description: description })
      : request('POST', '/api/projects', { title: title, description: description });
    call
      .then(function (p) {
        notify(id ? 'Changes saved.' : 'Project created.');
        go('#/projects/' + (p && p.id ? p.id : id));
      })
      .catch(function (err) {
        if (err.status === 401) return handleFailure(err);
        showError(form, err.message);
      })
      .then(function () {
        lock(form, false);
      });
  });

  function afterUserRemoved(self) {
    if (self) {
      state.me = null;
      renderNav();
      notify('Your account was deleted.');
      go('#/');
    } else {
      notify('User deleted.');
      go('#/users');
    }
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-action]') : null;
    if (!el) return;
    var action = el.getAttribute('data-action');
    var id = el.getAttribute('data-id');

    if (action === 'tab') {
      state.tab = el.getAttribute('data-tab');
      syncTabs();
      renderProjects();
    } else if (action === 'signout') {
      request('POST', '/api/signout').then(
        function () {
          state.me = null;
          state.projects = [];
                renderNav();
          notify('You signed out.');
          go('#/');
        },
        function (err) {
          notify(err.message, 'error');
        }
      );
    } else if (action === 'delete-project') {
      var back = el.getAttribute('data-back');
      askConfirm('Delete this project?', 'This cannot be undone.').then(function (ok) {
        if (!ok) return;
        request('DELETE', '/api/projects/' + id).then(
          function () {
            notify('Project deleted.');
            if (back) go('#/projects');
            else openProjects();
          },
          handleFailure
        );
      });
    } else if (action === 'delete-user') {
      var self = state.me && String(state.me.id) === id;
      askConfirm(
        self ? 'Delete your account?' : 'Delete this user?',
        self ? 'Your account and all your projects will be deleted permanently.' : 'The user and their projects will be deleted permanently.'
      ).then(function (ok) {
        if (!ok) return;
        request('DELETE', '/api/users/' + id).then(function () {
          afterUserRemoved(self);
        }, handleFailure);
      });
    } else if (action === 'set-admin' || action === 'remove-admin') {
      var path = action === 'set-admin' ? 'set_admin' : 'remove_admin';
      request('PUT', '/api/users/' + id + '/' + path).then(function () {
        notify(action === 'set-admin' ? 'User is now an admin.' : 'Admin role removed.');
        if (state.me && String(state.me.id) === id) {
          loadMe().then(function () {
            renderNav();
            go('#/projects');
          });
        } else {
          openUser(id);
        }
      }, handleFailure);
    }
  });

  window.addEventListener('hashchange', route);

  if (location.protocol === 'file:') {
    document.getElementById('file-warning').hidden = false;
  }

  loadMe().then(
    function () {
      state.ready = true;
      route();
    },
    function () {
      state.ready = true;
      state.me = null;
      route();
      notify('Cannot reach the server. Is it running?', 'error');
    }
  );
})();
