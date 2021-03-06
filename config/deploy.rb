require 'rvm/capistrano'
require "bundler/capistrano"

set :rvm_ruby_string, "2.0.0-p195"

task :production do
  set :webserver, "forum.kodujdlapolski.pl"
  set :stage, 'production'
end

set :user, "kdpforum"
set :stage, "production"
set(:rails_env) { fetch(:stage) }
set :application, "kdpforum"
set :deploy_to, "/home/#{application}/app"

set :repository, "git@github.com:kodujdlapolski/discourse.git"

set :rvm_type, :system
set :rvm_path, "/usr/local/rvm"

role(:db, :primary => true) { fetch(:webserver) }
role(:app) { fetch(:webserver) }
role(:web) { fetch(:webserver) }

set :remote, "origin"
set(:current_revision)  { capture("cd #{current_path}; git rev-parse HEAD").strip }

set :scm, :git

set(:latest_release)  { fetch(:current_path) }
set(:release_path)    { fetch(:current_path) }
set(:current_release) { fetch(:current_path) }

set(:runner) { "RAILS_ENV=#{fetch(:stage)} bundle exec" }

set :date_format, ''

branches = {:production => :master}
set(:branch) { branches[fetch(:stage).to_sym].to_s } unless exists?(:branch)

set :gateway, "deploy@s.netguru.co" unless exists?(:gateway)

after "deploy:update_code", "bundle:install"
after "deploy:update_code", "deploy:precompile"

namespace :deploy do

  task :default do
    transaction do
      update
      migrate unless fetch(:skip_migrations, false)
      restart
    end
  end

  task :symlink do
  end

  task :precompile do
    run "cd #{current_path} && #{runner} rake assets:precompile"
  end

  task :update do
    transaction do
      update_code
    end
  end

  task :migrate do
    run "cd #{current_path} && #{runner} rake db:migrate"
  end

  desc "Update the deployed code"
  task :update_code, :except => { :no_release => true } do
      run "cd #{current_path} && git checkout #{branch} && git pull origin #{branch}"
  end

  task :restart, :except => { :no_release => true } do
    run "touch #{current_path}/tmp/restart.txt"
  end

end