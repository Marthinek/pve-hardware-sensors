package PVE::API2::Sensors;

use strict;
use warnings;

use PVE::RESTHandler;
use PVE::Tools qw(run_command);

use base qw(PVE::RESTHandler);

__PACKAGE__->register_method({
    name => 'get_sensors',
    path => '',
    method => 'GET',
    description => 'Get hardware sensor values',
    permissions => {
        user => 'all',
    },
    parameters => {
        additionalProperties => 0,
    },
    returns => {
        type => 'object',
        properties => {
            version => {
                type => 'integer',
            },
            cpu => {
                type => 'object',
            },
            gpu => {
                type => 'array',
                items => {
                    type => 'object',
                },
            },
            storage => {
                type => 'array',
                items => {
                    type => 'object',
                },
            },
        },
    },
    code => sub {
        my $output = '';

        run_command(
            ['/usr/local/bin/pve-sensors'],
            outfunc => sub {
                $output .= "$_[0]\n";
            },
        );

        chomp($output);

        return PVE::JSONSchema::decode_json($output);
    },
});

1;
